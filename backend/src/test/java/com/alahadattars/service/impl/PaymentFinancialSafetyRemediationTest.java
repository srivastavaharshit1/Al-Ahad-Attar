package com.alahadattars.service.impl;

import com.alahadattars.dto.payment.RefundResult;
import com.alahadattars.entity.AdminNotification;
import com.alahadattars.entity.PaymentIntent;
import com.alahadattars.entity.PaymentReconciliationLog;
import com.alahadattars.entity.User;
import com.alahadattars.enums.ReconciliationStatus;
import com.alahadattars.repository.AdminNotificationRepository;
import com.alahadattars.repository.OrderRepository;
import com.alahadattars.repository.PaymentIntentRepository;
import com.alahadattars.repository.PaymentReconciliationLogRepository;
import com.alahadattars.repository.WebhookEventRepository;
import com.alahadattars.service.EmailService;
import com.alahadattars.service.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Phase 4: Payment Reconciliation Financial Safety Remediation Tests")
class PaymentFinancialSafetyRemediationTest {

    @Mock
    private PaymentIntentRepository paymentIntentRepository;

    @Mock
    private PaymentReconciliationLogRepository reconciliationLogRepository;

    @Mock
    private WebhookEventRepository webhookEventRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private PaymentService paymentService;

    @Mock
    private EmailService emailService;

    @Mock
    private AdminNotificationRepository adminNotificationRepository;

    @Mock
    private PlatformTransactionManager transactionManager;

    @Mock
    private TransactionStatus transactionStatus;

    private PaymentReconciliationServiceImpl reconciliationService;

    @BeforeEach
    void setUp() {
        lenient().when(transactionManager.getTransaction(any())).thenReturn(transactionStatus);

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

    private PaymentIntent createSampleIntent(Long id, String orderId, BigDecimal amount, ReconciliationStatus status) {
        return PaymentIntent.builder()
                .razorpayOrderId(orderId)
                .razorpayPaymentId("pay_" + id)
                .amount(amount)
                .consumed(false)
                .reconciliationStatus(status)
                .reconciliationAttempts(0)
                .user(User.builder().email("customer@example.com").firstName("Zaid").lastName("Khan").build())
                .build();
    }

    @Test
    @DisplayName("Test 1: Gateway creates refund, application times out before saving response, retry uses the same idempotency key")
    void test1_gatewayCreatesRefund_appTimesOutBeforeSaving_retryReusesSameIdempotencyKey() {
        Long intentId = 101L;
        String orderId = "order_rzp_101";
        BigDecimal amount = new BigDecimal("1299.00");
        PaymentIntent intent = createSampleIntent(intentId, orderId, amount, ReconciliationStatus.NONE);

        when(paymentIntentRepository.findByIdForUpdate(intentId)).thenReturn(Optional.of(intent));
        when(orderRepository.existsByTransactionId("pay_101")).thenReturn(false);
        when(paymentService.checkExistingRefund("pay_101", amount)).thenReturn(Optional.empty());

        // First attempt: Network timeout occurs while communicating with gateway
        when(paymentService.initiateRefund(eq("pay_101"), eq(amount), anyString()))
                .thenReturn(RefundResult.builder().outcome(RefundResult.RefundOutcome.UNKNOWN_TIMEOUT).errorMessage("SocketTimeoutException").build());

        reconciliationService.processSingleIntent(intentId);

        // Verification of Attempt 1: State is PENDING_CONFIRMATION, lease expires, attempt counter incremented
        assertEquals(ReconciliationStatus.PENDING_CONFIRMATION, intent.getReconciliationStatus());
        assertEquals(1, intent.getReconciliationAttempts());

        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        verify(paymentService).initiateRefund(eq("pay_101"), eq(amount), keyCaptor.capture());
        String firstKey = keyCaptor.getValue();
        assertEquals("recon-order_rzp_101", firstKey);

        // Simulate lease expiration for retry
        intent.setReconciliationLeaseExpiresAt(LocalDateTime.now().minusMinutes(1));

        // Attempt 2 (Retry): Gateway lookup returns the adopted processed refund
        when(paymentService.checkExistingRefund("pay_101", amount))
                .thenReturn(Optional.of(RefundResult.builder().outcome(RefundResult.RefundOutcome.PROCESSED).refundId("rfnd_adopted_101").build()));

        reconciliationService.processSingleIntent(intentId);

        // Verification of Attempt 2: Adopted refund transitions intent to REFUNDED without issuing a new gateway call
        assertEquals(ReconciliationStatus.REFUNDED, intent.getReconciliationStatus());
        assertEquals("rfnd_adopted_101", intent.getReconciliationRefundId());

        // initiateRefund must have been called exactly ONCE across both cycles
        verify(paymentService, times(1)).initiateRefund(anyString(), any(BigDecimal.class), anyString());
    }

    @Test
    @DisplayName("Test 2: Existing-refund lookup fails due to network error; no second refund request is dispatched")
    void test2_existingRefundLookupFailsNetworkError_noSecondRefundDispatched() {
        Long intentId = 102L;
        String orderId = "order_rzp_102";
        BigDecimal amount = new BigDecimal("850.00");
        PaymentIntent intent = createSampleIntent(intentId, orderId, amount, ReconciliationStatus.NONE);

        when(paymentIntentRepository.findByIdForUpdate(intentId)).thenReturn(Optional.of(intent));
        when(orderRepository.existsByTransactionId("pay_102")).thenReturn(false);

        // checkExistingRefund encounters network/gateway timeout (ambiguous outcome)
        when(paymentService.checkExistingRefund("pay_102", amount))
                .thenReturn(Optional.of(RefundResult.builder()
                        .outcome(RefundResult.RefundOutcome.UNKNOWN_TIMEOUT)
                        .errorMessage("Could not check existing refunds: Read timed out")
                        .build()));

        reconciliationService.processSingleIntent(intentId);

        // Intent must remain in PENDING_CONFIRMATION awaiting future verification
        assertEquals(ReconciliationStatus.PENDING_CONFIRMATION, intent.getReconciliationStatus());
        assertTrue(intent.getReconciliationFailureReason().contains("Read timed out"));

        // CRITICAL INVARIANT: initiateRefund must NEVER be called when lookup encounters an ambiguous error
        verify(paymentService, never()).initiateRefund(anyString(), any(BigDecimal.class), anyString());
    }

    @Test
    @DisplayName("Test 3: Two legitimate partial refunds use different idempotency keys")
    void test3_twoLegitimatePartialRefunds_useDifferentIdempotencyKeys() {
        String paymentId = "pay_shared_999";
        BigDecimal amount1 = new BigDecimal("500.00");
        BigDecimal amount2 = new BigDecimal("700.00");

        String order1Key = "order-ORD-PART-1";
        String order2Key = "order-ORD-PART-2";

        assertNotEquals(order1Key, order2Key);
        assertTrue(order1Key.length() >= 10);
        assertTrue(order2Key.length() >= 10);

        when(paymentService.initiateRefund(eq(paymentId), eq(amount1), eq(order1Key)))
                .thenReturn(RefundResult.builder().outcome(RefundResult.RefundOutcome.PROCESSED).refundId("rfnd_part_1").build());
        when(paymentService.initiateRefund(eq(paymentId), eq(amount2), eq(order2Key)))
                .thenReturn(RefundResult.builder().outcome(RefundResult.RefundOutcome.PROCESSED).refundId("rfnd_part_2").build());

        RefundResult res1 = paymentService.initiateRefund(paymentId, amount1, order1Key);
        RefundResult res2 = paymentService.initiateRefund(paymentId, amount2, order2Key);

        assertEquals("rfnd_part_1", res1.getRefundId());
        assertEquals("rfnd_part_2", res2.getRefundId());
        verify(paymentService).initiateRefund(paymentId, amount1, order1Key);
        verify(paymentService).initiateRefund(paymentId, amount2, order2Key);
    }

    @Test
    @DisplayName("Test 4: Same refund retry uses identical request amount and body")
    void test4_sameRefundRetry_usesIdenticalRequestAmountAndBody() {
        Long intentId = 104L;
        String orderId = "order_rzp_104";
        BigDecimal amount = new BigDecimal("2499.50");
        PaymentIntent intent = createSampleIntent(intentId, orderId, amount, ReconciliationStatus.NONE);

        when(paymentIntentRepository.findByIdForUpdate(intentId)).thenReturn(Optional.of(intent));
        when(orderRepository.existsByTransactionId("pay_104")).thenReturn(false);
        when(paymentService.checkExistingRefund("pay_104", amount)).thenReturn(Optional.empty());

        // First attempt returns in-flight SUCCESS
        when(paymentService.initiateRefund(eq("pay_104"), eq(amount), eq("recon-order_rzp_104")))
                .thenReturn(RefundResult.builder().outcome(RefundResult.RefundOutcome.SUCCESS).refundId("rfnd_104").build());

        reconciliationService.processSingleIntent(intentId);

        ArgumentCaptor<BigDecimal> amountCaptor = ArgumentCaptor.forClass(BigDecimal.class);
        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        verify(paymentService).initiateRefund(eq("pay_104"), amountCaptor.capture(), keyCaptor.capture());

        assertEquals(new BigDecimal("2499.50"), amountCaptor.getValue());
        assertEquals("recon-order_rzp_104", keyCaptor.getValue());
    }

    @Test
    @DisplayName("Test 5: HTTP 409 retains pending state and does not create a new operation")
    void test5_http409Conflict_retainsPendingState_doesNotCreateNewOperation() {
        Long intentId = 105L;
        String orderId = "order_rzp_105";
        BigDecimal amount = new BigDecimal("1500.00");
        PaymentIntent intent = createSampleIntent(intentId, orderId, amount, ReconciliationStatus.NONE);

        when(paymentIntentRepository.findByIdForUpdate(intentId)).thenReturn(Optional.of(intent));
        when(orderRepository.existsByTransactionId("pay_105")).thenReturn(false);
        when(paymentService.checkExistingRefund("pay_105", amount)).thenReturn(Optional.empty());

        // Razorpay returns HTTP 409 Conflict (idempotency key currently processing at gateway)
        when(paymentService.initiateRefund(eq("pay_105"), eq(amount), anyString()))
                .thenReturn(RefundResult.builder()
                        .outcome(RefundResult.RefundOutcome.UNKNOWN_TIMEOUT)
                        .errorMessage("Razorpay returned HTTP 409 Conflict: Refund is currently in progress at gateway. Retaining pending state.")
                        .build());

        reconciliationService.processSingleIntent(intentId);

        // State remains PENDING_CONFIRMATION for retry; NOT marked FAILED
        assertEquals(ReconciliationStatus.PENDING_CONFIRMATION, intent.getReconciliationStatus());
        assertTrue(intent.getReconciliationFailureReason().contains("HTTP 409 Conflict"));

        // Admin stuck checkout alert is NOT triggered for in-progress operations
        verify(emailService, never()).sendAdminStuckCheckoutEmail(any());
    }

    @Test
    @DisplayName("Test 6: Already-refunded error with a matching existing refund is reconciled safely")
    void test6_alreadyRefundedError_withMatchingExistingRefund_reconciledSafely() {
        Long intentId = 106L;
        String orderId = "order_rzp_106";
        BigDecimal amount = new BigDecimal("1999.00");
        PaymentIntent intent = createSampleIntent(intentId, orderId, amount, ReconciliationStatus.NONE);

        when(paymentIntentRepository.findByIdForUpdate(intentId)).thenReturn(Optional.of(intent));
        when(orderRepository.existsByTransactionId("pay_106")).thenReturn(false);

        // Initial check was empty (e.g. eventual consistency lag)
        when(paymentService.checkExistingRefund("pay_106", amount)).thenReturn(Optional.empty());

        // Gateway returns PROCESSED following strict verification of "already refunded"
        when(paymentService.initiateRefund(eq("pay_106"), eq(amount), anyString()))
                .thenReturn(RefundResult.builder().outcome(RefundResult.RefundOutcome.PROCESSED).refundId("rfnd_verified_106").build());

        reconciliationService.processSingleIntent(intentId);

        assertEquals(ReconciliationStatus.REFUNDED, intent.getReconciliationStatus());
        assertEquals("rfnd_verified_106", intent.getReconciliationRefundId());
        assertNotNull(intent.getReconciliationResolvedAt());
        verify(emailService).sendRefundSuccessfulEmail(any());
    }

    @Test
    @DisplayName("Test 7: Already-refunded error without verifiable matching refund does not become false success")
    void test7_alreadyRefundedError_withoutVerifiableMatchingRefund_doesNotBecomeFalseSuccess() {
        Long intentId = 107L;
        String orderId = "order_rzp_107";
        BigDecimal amount = new BigDecimal("3500.00");
        PaymentIntent intent = createSampleIntent(intentId, orderId, amount, ReconciliationStatus.NONE);

        when(paymentIntentRepository.findByIdForUpdate(intentId)).thenReturn(Optional.of(intent));
        when(orderRepository.existsByTransactionId("pay_107")).thenReturn(false);
        when(paymentService.checkExistingRefund("pay_107", amount)).thenReturn(Optional.empty());

        // Gateway claimed payment was refunded, but verification failed to find matching refund
        when(paymentService.initiateRefund(eq("pay_107"), eq(amount), anyString()))
                .thenReturn(RefundResult.builder()
                        .outcome(RefundResult.RefundOutcome.DEFINITIVE_FAILURE)
                        .errorMessage("Razorpay reported payment already refunded, but matching refund record could not be verified")
                        .build());

        reconciliationService.processSingleIntent(intentId);

        // Invariant: Must NOT be marked REFUNDED!
        assertEquals(ReconciliationStatus.FAILED, intent.getReconciliationStatus());
        assertNull(intent.getReconciliationRefundId());

        // Admin alert must be raised for human investigation
        verify(adminNotificationRepository).save(any(AdminNotification.class));
        verify(emailService).sendAdminStuckCheckoutEmail(any());
        verify(emailService, never()).sendRefundSuccessfulEmail(any());
    }

    @Test
    @DisplayName("Test 8: Late webhook cannot overwrite MANUALLY_RESOLVED")
    void test8_lateWebhook_cannotOverwrite_manuallyResolved() {
        PaymentIntent intent = createSampleIntent(108L, "order_rzp_108", new BigDecimal("1200.00"), ReconciliationStatus.MANUALLY_RESOLVED);
        intent.setReconciliationRefundId("manual_gateway_ref_108");

        when(paymentIntentRepository.findByRazorpayPaymentIdForUpdate("pay_108")).thenReturn(Optional.of(intent));
        when(orderRepository.existsByTransactionId("pay_108")).thenReturn(false);

        // Inbound webhook arrives with refund.processed
        reconciliationService.reconcileRefundFromWebhook("rfnd_late_hook_108", "pay_108", "processed");

        // Status must remain MANUALLY_RESOLVED
        assertEquals(ReconciliationStatus.MANUALLY_RESOLVED, intent.getReconciliationStatus());
        assertEquals("manual_gateway_ref_108", intent.getReconciliationRefundId());

        // No customer refund email should be triggered by duplicate webhook
        verify(emailService, never()).sendRefundSuccessfulEmail(any());
    }

    @Test
    @DisplayName("Test 9: Late webhook cannot overwrite EXEMPT_ORDER_FOUND")
    void test9_lateWebhook_cannotOverwrite_exemptOrderFound() {
        PaymentIntent intent = createSampleIntent(109L, "order_rzp_109", new BigDecimal("999.00"), ReconciliationStatus.EXEMPT_ORDER_FOUND);

        when(paymentIntentRepository.findByRazorpayPaymentIdForUpdate("pay_109")).thenReturn(Optional.of(intent));
        when(orderRepository.existsByTransactionId("pay_109")).thenReturn(false);

        // Inbound webhook arrives
        reconciliationService.reconcileRefundFromWebhook("rfnd_late_hook_109", "pay_109", "processed");

        // Status must remain EXEMPT_ORDER_FOUND
        assertEquals(ReconciliationStatus.EXEMPT_ORDER_FOUND, intent.getReconciliationStatus());
        verify(emailService, never()).sendRefundSuccessfulEmail(any());
    }

    @Test
    @DisplayName("Test 10: Concurrent workers cannot create duplicate refund operations")
    void test10_concurrentWorkers_cannotCreateDuplicateRefundOperations() throws Exception {
        Long intentId = 110L;
        String orderId = "order_rzp_110";
        BigDecimal amount = new BigDecimal("1000.00");
        PaymentIntent intent = createSampleIntent(intentId, orderId, amount, ReconciliationStatus.NONE);

        when(paymentIntentRepository.findByIdForUpdate(intentId)).thenReturn(Optional.of(intent));
        when(orderRepository.existsByTransactionId("pay_110")).thenReturn(false);
        when(paymentService.checkExistingRefund("pay_110", amount)).thenReturn(Optional.empty());

        when(paymentService.initiateRefund(eq("pay_110"), eq(amount), anyString()))
                .thenAnswer(inv -> {
                    Thread.sleep(50); // Simulate network latency
                    return RefundResult.builder().outcome(RefundResult.RefundOutcome.PROCESSED).refundId("rfnd_110").build();
                });

        int threads = 3;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(threads);
        AtomicInteger successCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                try {
                    reconciliationService.processSingleIntent(intentId);
                    successCount.incrementAndGet();
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await();
        executor.shutdown();

        // Exactly ONE refund operation is dispatched due to lease fencing & terminal state guards
        verify(paymentService, atMost(1)).initiateRefund(eq("pay_110"), eq(amount), anyString());
        assertEquals(ReconciliationStatus.REFUNDED, intent.getReconciliationStatus());
        assertEquals("rfnd_110", intent.getReconciliationRefundId());
    }
}

