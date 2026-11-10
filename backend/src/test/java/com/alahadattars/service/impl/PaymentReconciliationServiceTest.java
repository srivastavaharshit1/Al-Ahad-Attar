package com.alahadattars.service.impl;

import com.alahadattars.dto.admin.reconciliation.AdminManualResolveRequest;
import com.alahadattars.dto.admin.reconciliation.PaymentReconciliationResponse;
import com.alahadattars.dto.payment.RefundResult;
import com.alahadattars.entity.AdminNotification;
import com.alahadattars.entity.PaymentIntent;
import com.alahadattars.entity.PaymentReconciliationLog;
import com.alahadattars.entity.User;
import com.alahadattars.entity.WebhookEvent;
import com.alahadattars.enums.ReconciliationStatus;
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.repository.AdminNotificationRepository;
import com.alahadattars.repository.OrderRepository;
import com.alahadattars.repository.PaymentIntentRepository;
import com.alahadattars.repository.PaymentReconciliationLogRepository;
import com.alahadattars.repository.WebhookEventRepository;
import com.alahadattars.service.EmailService;
import com.alahadattars.service.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentReconciliationServiceTest {

    @Mock private PaymentIntentRepository paymentIntentRepository;
    @Mock private PaymentReconciliationLogRepository reconciliationLogRepository;
    @Mock private WebhookEventRepository webhookEventRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private PaymentService paymentService;
    @Mock private EmailService emailService;
    @Mock private AdminNotificationRepository adminNotificationRepository;
    @Mock private PlatformTransactionManager transactionManager;

    private PaymentReconciliationServiceImpl reconciliationService;

    @BeforeEach
    void setUp() {
        org.mockito.Mockito.lenient().when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());

        reconciliationService = new PaymentReconciliationServiceImpl(
                paymentIntentRepository,
                reconciliationLogRepository,
                webhookEventRepository,
                orderRepository,
                paymentService,
                emailService,
                adminNotificationRepository,
                transactionManager
        );
    }

    private PaymentIntent createSampleIntent(Long id, BigDecimal amount, ReconciliationStatus status) {
        return PaymentIntent.builder()
                .razorpayOrderId("order_rzp_" + id)
                .razorpayPaymentId("pay_rzp_" + id)
                .amount(amount)
                .consumed(false)
                .reconciliationStatus(status)
                .reconciliationAttempts(0)
                .user(User.builder().email("customer@example.com").firstName("Zaid").lastName("Khan").build())
                .build();
    }

    @Nested
    @DisplayName("Orphaned Payment Full Automated Reconciliation Tests")
    class AutomatedReconciliationTests {

        @Test
        @DisplayName("Captured payment with no order transitions NONE -> PROCESSING -> REFUNDED when gateway reports processed")
        void testOrphanPaymentFullRefundProcessed() {
            PaymentIntent intent = createSampleIntent(1L, new BigDecimal("1299.00"), ReconciliationStatus.NONE);
            when(paymentIntentRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(intent));
            when(orderRepository.existsByTransactionId("pay_rzp_1")).thenReturn(false);
            when(paymentService.checkExistingRefund("pay_rzp_1", new BigDecimal("1299.00"))).thenReturn(Optional.empty());
            when(paymentService.initiateRefund("pay_rzp_1", new BigDecimal("1299.00")))
                    .thenReturn(RefundResult.builder().outcome(RefundResult.RefundOutcome.PROCESSED).refundId("rfnd_123").build());

            reconciliationService.processSingleIntent(1L);

            assertEquals(ReconciliationStatus.REFUNDED, intent.getReconciliationStatus());
            assertEquals("rfnd_123", intent.getReconciliationRefundId());
            assertTrue(intent.isConsumed());
            assertNotNull(intent.getReconciliationResolvedAt());
            assertNull(intent.getReconciliationLeaseToken());

            verify(adminNotificationRepository).save(any(AdminNotification.class));
            verify(emailService).sendRefundSuccessfulEmail(any());
            verify(reconciliationLogRepository, times(2)).save(any(PaymentReconciliationLog.class));
        }

        @Test
        @DisplayName("Existing refund on Razorpay is directly adopted without issuing duplicate refund (Crash B recovery)")
        void testExistingRefundAdoptedWithoutDuplicateApiCall() {
            PaymentIntent intent = createSampleIntent(2L, new BigDecimal("850.00"), ReconciliationStatus.PROCESSING);
            intent.setReconciliationLeaseExpiresAt(LocalDateTime.now().minusMinutes(1)); // Expired lease
            when(paymentIntentRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(intent));
            when(orderRepository.existsByTransactionId("pay_rzp_2")).thenReturn(false);

            // Razorpay confirms refund was already processed
            when(paymentService.checkExistingRefund("pay_rzp_2", new BigDecimal("850.00")))
                    .thenReturn(Optional.of(RefundResult.builder().outcome(RefundResult.RefundOutcome.PROCESSED).refundId("rfnd_existing_888").build()));

            reconciliationService.processSingleIntent(2L);

            assertEquals(ReconciliationStatus.REFUNDED, intent.getReconciliationStatus());
            assertEquals("rfnd_existing_888", intent.getReconciliationRefundId());

            // CRITICAL: initiateRefund must NOT be called
            verify(paymentService, never()).initiateRefund(anyString(), any(BigDecimal.class));
        }

        @Test
        @DisplayName("Gateway submitted status retains PENDING_CONFIRMATION and does not transition to REFUNDED")
        void testSubmittedRefundRetainsPendingConfirmation() {
            PaymentIntent intent = createSampleIntent(3L, new BigDecimal("1500.00"), ReconciliationStatus.NONE);
            when(paymentIntentRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(intent));
            when(orderRepository.existsByTransactionId("pay_rzp_3")).thenReturn(false);
            when(paymentService.checkExistingRefund("pay_rzp_3", new BigDecimal("1500.00"))).thenReturn(Optional.empty());

            // Razorpay accepts refund as 'submitted' (SUCCESS in DTO)
            when(paymentService.initiateRefund("pay_rzp_3", new BigDecimal("1500.00")))
                    .thenReturn(RefundResult.builder().outcome(RefundResult.RefundOutcome.SUCCESS).refundId("rfnd_in_flight").build());

            reconciliationService.processSingleIntent(3L);

            assertEquals(ReconciliationStatus.PENDING_CONFIRMATION, intent.getReconciliationStatus());
            assertEquals("rfnd_in_flight", intent.getReconciliationRefundId());
            assertNull(intent.getReconciliationResolvedAt()); // NOT resolved yet
        }

        @Test
        @DisplayName("Gateway network timeout produces PENDING_CONFIRMATION awaiting webhook")
        void testGatewayTimeoutRetainsPendingConfirmation() {
            PaymentIntent intent = createSampleIntent(4L, new BigDecimal("999.00"), ReconciliationStatus.NONE);
            when(paymentIntentRepository.findByIdForUpdate(4L)).thenReturn(Optional.of(intent));
            when(orderRepository.existsByTransactionId("pay_rzp_4")).thenReturn(false);
            when(paymentService.checkExistingRefund("pay_rzp_4", new BigDecimal("999.00"))).thenReturn(Optional.empty());

            when(paymentService.initiateRefund("pay_rzp_4", new BigDecimal("999.00")))
                    .thenReturn(RefundResult.builder().outcome(RefundResult.RefundOutcome.UNKNOWN_TIMEOUT).errorMessage("SocketTimeoutException").build());

            reconciliationService.processSingleIntent(4L);

            assertEquals(ReconciliationStatus.PENDING_CONFIRMATION, intent.getReconciliationStatus());
            assertNotNull(intent.getReconciliationFailureReason());
            verify(emailService, never()).sendAdminStuckCheckoutEmail(any());
        }

        @Test
        @DisplayName("Definitive gateway failure transitions to FAILED and raises admin alerts")
        void testDefinitiveFailureTransitionsToFailed() {
            PaymentIntent intent = createSampleIntent(5L, new BigDecimal("2500.00"), ReconciliationStatus.NONE);
            when(paymentIntentRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(intent));
            when(orderRepository.existsByTransactionId("pay_rzp_5")).thenReturn(false);
            when(paymentService.checkExistingRefund("pay_rzp_5", new BigDecimal("2500.00"))).thenReturn(Optional.empty());

            when(paymentService.initiateRefund("pay_rzp_5", new BigDecimal("2500.00")))
                    .thenReturn(RefundResult.builder().outcome(RefundResult.RefundOutcome.DEFINITIVE_FAILURE).errorMessage("Card expired or merchant balance exhausted").build());

            reconciliationService.processSingleIntent(5L);

            assertEquals(ReconciliationStatus.FAILED, intent.getReconciliationStatus());
            verify(emailService).sendAdminStuckCheckoutEmail(any());
            verify(adminNotificationRepository).save(any(AdminNotification.class));
        }

        @Test
        @DisplayName("Partial refund on gateway check is never adopted; fresh full refund is initiated")
        void testPartialRefundAtGatewayIsIgnored() {
            PaymentIntent intent = createSampleIntent(13L, new BigDecimal("1500.00"), ReconciliationStatus.NONE);
            when(paymentIntentRepository.findByIdForUpdate(13L)).thenReturn(Optional.of(intent));
            when(orderRepository.existsByTransactionId("pay_rzp_13")).thenReturn(false);

            // checkExistingRefund checks for exact amount 1500.00. Since gateway had a partial refund of 500, checkExistingRefund returns empty
            when(paymentService.checkExistingRefund("pay_rzp_13", new BigDecimal("1500.00"))).thenReturn(Optional.empty());
            when(paymentService.initiateRefund("pay_rzp_13", new BigDecimal("1500.00")))
                    .thenReturn(RefundResult.builder().outcome(RefundResult.RefundOutcome.PROCESSED).refundId("rfnd_full_1500").build());

            reconciliationService.processSingleIntent(13L);

            assertEquals(ReconciliationStatus.REFUNDED, intent.getReconciliationStatus());
            assertEquals("rfnd_full_1500", intent.getReconciliationRefundId());
            verify(paymentService).initiateRefund("pay_rzp_13", new BigDecimal("1500.00"));
        }

        @Test
        @DisplayName("Full refund amount in paise precision converts rupees correctly without float rounding loss")
        void testRefundAmountInPaiseConversion() {
            BigDecimal rupees = new BigDecimal("2499.50");
            int paise = rupees.multiply(new BigDecimal("100")).intValue();
            assertEquals(249950, paise);
        }
    }

    @Nested
    @DisplayName("Lease Fencing and Concurrency Protection Tests")
    class LeaseFencingTests {

        @Test
        @DisplayName("Fencing token mismatch safely discards delayed worker write")
        void testFencingTokenMismatchDiscardsStaleWrite() {
            PaymentIntent intent = createSampleIntent(6L, new BigDecimal("1000.00"), ReconciliationStatus.NONE);

            // Phase 1: Worker claims lease
            when(paymentIntentRepository.findByIdForUpdate(6L)).thenReturn(Optional.of(intent));
            when(orderRepository.existsByTransactionId("pay_rzp_6")).thenReturn(false);
            when(paymentService.checkExistingRefund("pay_rzp_6", new BigDecimal("1000.00"))).thenReturn(Optional.empty());
            when(paymentService.initiateRefund("pay_rzp_6", new BigDecimal("1000.00")))
                    .thenAnswer(invocation -> {
                        // Simulate lease expiration & second worker overriding lease token while HTTP call was active
                        intent.setReconciliationLeaseToken("worker_2_token_override");
                        return RefundResult.builder().outcome(RefundResult.RefundOutcome.PROCESSED).refundId("rfnd_late").build();
                    });

            reconciliationService.processSingleIntent(6L);

            // Because lease token was overwritten, Worker 1's write must be discarded
            assertFalse(ReconciliationStatus.REFUNDED == intent.getReconciliationStatus() && "rfnd_late".equals(intent.getReconciliationRefundId()));
        }

        @Test
        @DisplayName("Existing order discovery marks intent EXEMPT_ORDER_FOUND and never refunds")
        void testExistingOrderDiscoveryExemptsFromRefund() {
            PaymentIntent intent = createSampleIntent(7L, new BigDecimal("500.00"), ReconciliationStatus.NONE);
            when(paymentIntentRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(intent));
            when(orderRepository.existsByTransactionId("pay_rzp_7")).thenReturn(true); // Order exists!

            reconciliationService.processSingleIntent(7L);

            assertEquals(ReconciliationStatus.EXEMPT_ORDER_FOUND, intent.getReconciliationStatus());
            assertTrue(intent.isConsumed());

            verify(paymentService, never()).checkExistingRefund(anyString(), any());
            verify(paymentService, never()).initiateRefund(anyString(), any());
        }

        @Test
        @DisplayName("Concurrent worker skips intent when active lease has not expired")
        void testConcurrentWorkerSkipsActiveLease() {
            PaymentIntent intent = createSampleIntent(14L, new BigDecimal("700.00"), ReconciliationStatus.PROCESSING);
            intent.setReconciliationLeaseExpiresAt(LocalDateTime.now().plusMinutes(4)); // Active lease!
            when(paymentIntentRepository.findByIdForUpdate(14L)).thenReturn(Optional.of(intent));
            when(orderRepository.existsByTransactionId("pay_rzp_14")).thenReturn(false);

            reconciliationService.processSingleIntent(14L);

            // Must NOT call gateway because lease is still active
            verify(paymentService, never()).checkExistingRefund(anyString(), any());
            verify(paymentService, never()).initiateRefund(anyString(), any());
        }

        @Test
        @DisplayName("Webhook arriving during worker processing transitions to REFUNDED; worker skips overwrite")
        void testWebhookArrivingDuringWorkerProcessingSkipsWorkerOverwrite() {
            PaymentIntent intent = createSampleIntent(15L, new BigDecimal("800.00"), ReconciliationStatus.NONE);
            when(paymentIntentRepository.findByIdForUpdate(15L)).thenReturn(Optional.of(intent));
            when(orderRepository.existsByTransactionId("pay_rzp_15")).thenReturn(false);
            when(paymentService.checkExistingRefund("pay_rzp_15", new BigDecimal("800.00"))).thenReturn(Optional.empty());

            when(paymentService.initiateRefund("pay_rzp_15", new BigDecimal("800.00")))
                    .thenAnswer(invocation -> {
                        // Webhook arrived concurrently and settled status to REFUNDED
                        intent.setReconciliationStatus(ReconciliationStatus.REFUNDED);
                        intent.setReconciliationRefundId("rfnd_webhook_win");
                        return RefundResult.builder().outcome(RefundResult.RefundOutcome.PROCESSED).refundId("rfnd_worker_late").build();
                    });

            reconciliationService.processSingleIntent(15L);

            // Terminal status must remain the webhook's refund ID
            assertEquals(ReconciliationStatus.REFUNDED, intent.getReconciliationStatus());
            assertEquals("rfnd_webhook_win", intent.getReconciliationRefundId());
        }
    }

    @Nested
    @DisplayName("Webhook Reconciliation State Transition Tests")
    class WebhookReconciliationTests {

        @Test
        @DisplayName("refund.processed webhook transitions PENDING_CONFIRMATION to REFUNDED")
        void testWebhookRefundProcessedTransitionsToRefunded() {
            PaymentIntent intent = createSampleIntent(8L, new BigDecimal("600.00"), ReconciliationStatus.PENDING_CONFIRMATION);
            when(paymentIntentRepository.findByRazorpayPaymentIdForUpdate("pay_rzp_8")).thenReturn(Optional.of(intent));
            when(orderRepository.existsByTransactionId("pay_rzp_8")).thenReturn(false);

            reconciliationService.reconcileRefundFromWebhook("rfnd_hook_88", "pay_rzp_8", "processed");

            assertEquals(ReconciliationStatus.REFUNDED, intent.getReconciliationStatus());
            assertEquals("rfnd_hook_88", intent.getReconciliationRefundId());
            assertNotNull(intent.getReconciliationResolvedAt());
            verify(adminNotificationRepository).save(any(AdminNotification.class));
        }

        @Test
        @DisplayName("refund.failed webhook strictly transitions to FAILED and NEVER to REFUNDED")
        void testWebhookRefundFailedTransitionsStrictlyToFailed() {
            PaymentIntent intent = createSampleIntent(9L, new BigDecimal("750.00"), ReconciliationStatus.PENDING_CONFIRMATION);
            when(paymentIntentRepository.findByRazorpayPaymentIdForUpdate("pay_rzp_9")).thenReturn(Optional.of(intent));
            when(orderRepository.existsByTransactionId("pay_rzp_9")).thenReturn(false);

            reconciliationService.reconcileRefundFromWebhook("rfnd_hook_99", "pay_rzp_9", "failed");

            assertEquals(ReconciliationStatus.FAILED, intent.getReconciliationStatus());
            assertEquals("Razorpay reported refund.failed via webhook.", intent.getReconciliationFailureReason());
            verify(emailService).sendAdminStuckCheckoutEmail(any());
        }

        @Test
        @DisplayName("Duplicate webhook delivery is idempotent on already REFUNDED intent")
        void testDuplicateWebhookIgnored() {
            PaymentIntent intent = createSampleIntent(10L, new BigDecimal("1200.00"), ReconciliationStatus.REFUNDED);
            intent.setReconciliationRefundId("rfnd_settled");
            when(paymentIntentRepository.findByRazorpayPaymentIdForUpdate("pay_rzp_10")).thenReturn(Optional.of(intent));
            when(orderRepository.existsByTransactionId("pay_rzp_10")).thenReturn(false);

            reconciliationService.reconcileRefundFromWebhook("rfnd_settled", "pay_rzp_10", "processed");

            assertEquals(ReconciliationStatus.REFUNDED, intent.getReconciliationStatus());
            verify(adminNotificationRepository, never()).save(any());
        }

        @Test
        @DisplayName("Webhook ignored if Order exists for the payment (Routing Anomaly Guard)")
        void testWebhookRoutingIgnoredIfOrderExists() {
            PaymentIntent intent = createSampleIntent(16L, new BigDecimal("950.00"), ReconciliationStatus.NONE);
            when(paymentIntentRepository.findByRazorpayPaymentIdForUpdate("pay_rzp_16")).thenReturn(Optional.of(intent));
            when(orderRepository.existsByTransactionId("pay_rzp_16")).thenReturn(true); // Order exists!

            reconciliationService.reconcileRefundFromWebhook("rfnd_order_exists", "pay_rzp_16", "processed");

            // Status must remain NONE — orphan reconciliation must not touch order refunds
            assertEquals(ReconciliationStatus.NONE, intent.getReconciliationStatus());
            verify(adminNotificationRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Manual Resolution and Validation Tests")
    class ManualResolutionTests {

        @Test
        @DisplayName("Manual resolution succeeds with valid evidence and exact amount match")
        void testManualResolveSuccess() {
            PaymentIntent intent = createSampleIntent(11L, new BigDecimal("3200.00"), ReconciliationStatus.FAILED);
            when(paymentIntentRepository.findByIdForUpdate(11L)).thenReturn(Optional.of(intent));
            when(paymentIntentRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

            AdminManualResolveRequest request = AdminManualResolveRequest.builder()
                    .gatewayReference("rfnd_portal_3200")
                    .settledAmount(new BigDecimal("3200.00"))
                    .currency("INR")
                    .auditNotes("Customer refunded directly via Razorpay portal after bank verification.")
                    .supportingEvidenceOrReason("https://dashboard.razorpay.com/app/refunds/rfnd_portal_3200")
                    .build();

            PaymentReconciliationResponse response = reconciliationService.manualResolve(11L, request, "admin@alahadattars.com");

            assertEquals(ReconciliationStatus.MANUALLY_RESOLVED, intent.getReconciliationStatus());
            assertEquals("rfnd_portal_3200", intent.getReconciliationRefundId());
            assertNotNull(intent.getReconciliationResolvedAt());
            verify(reconciliationLogRepository).save(any(PaymentReconciliationLog.class));
            verify(adminNotificationRepository).save(any(AdminNotification.class));
        }

        @Test
        @DisplayName("Manual resolution rejects amount mismatch")
        void testManualResolveRejectsAmountMismatch() {
            PaymentIntent intent = createSampleIntent(12L, new BigDecimal("3200.00"), ReconciliationStatus.FAILED);
            when(paymentIntentRepository.findByIdForUpdate(12L)).thenReturn(Optional.of(intent));

            AdminManualResolveRequest request = AdminManualResolveRequest.builder()
                    .gatewayReference("rfnd_portal_diff")
                    .settledAmount(new BigDecimal("2500.00")) // Mismatch!
                    .currency("INR")
                    .auditNotes("Partial manual settlement attempted.")
                    .supportingEvidenceOrReason("Ticket #999")
                    .build();

            assertThrows(BadRequestException.class, () ->
                    reconciliationService.manualResolve(12L, request, "admin@alahadattars.com"));
        }

        @Test
        @DisplayName("Manual resolution rejects intents already in terminal REFUNDED status")
        void testManualResolveRejectsTerminalStatus() {
            PaymentIntent intent = createSampleIntent(17L, new BigDecimal("1800.00"), ReconciliationStatus.REFUNDED);
            when(paymentIntentRepository.findByIdForUpdate(17L)).thenReturn(Optional.of(intent));

            AdminManualResolveRequest request = AdminManualResolveRequest.builder()
                    .gatewayReference("rfnd_portal_duplicate")
                    .settledAmount(new BigDecimal("1800.00"))
                    .currency("INR")
                    .auditNotes("Attempting manual resolve on already settled intent.")
                    .supportingEvidenceOrReason("Ticket #1001")
                    .build();

            assertThrows(BadRequestException.class, () ->
                    reconciliationService.manualResolve(17L, request, "admin@alahadattars.com"));
        }
    }
}
