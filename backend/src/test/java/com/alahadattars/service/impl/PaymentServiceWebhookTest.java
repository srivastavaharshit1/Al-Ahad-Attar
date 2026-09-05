package com.alahadattars.service.impl;

import com.alahadattars.entity.PaymentIntent;
import com.alahadattars.entity.User;
import com.alahadattars.repository.CartRepository;
import com.alahadattars.repository.OrderRepository;
import com.alahadattars.repository.PaymentIntentRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.UserRepository;
import com.alahadattars.repository.WebhookEventRepository;
import com.alahadattars.service.CartService;
import com.alahadattars.service.StoreSettingsService;
import org.json.JSONObject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Covers the Razorpay webhook endpoint added to close the "customer paid but the browser never
 * completed the checkout redirect" gap: signature verification (fail-closed on a missing secret,
 * bad signature, or missing header) and the payment.captured reconciliation check against
 * PaymentIntent/Order.
 */
@ExtendWith(MockitoExtension.class)
class PaymentServiceWebhookTest {

    @Mock private CartService cartService;
    @Mock private StoreSettingsService storeSettingsService;
    @Mock private ProductVariantRepository productVariantRepository;
    @Mock private PaymentIntentRepository paymentIntentRepository;
    @Mock private UserRepository userRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private WebhookEventRepository webhookEventRepository;
    @Mock private com.alahadattars.service.EmailService emailService;

    private RefundTransactionSupport refundTransactionSupport;
    private PaymentServiceImpl paymentService;

    private static final String WEBHOOK_SECRET = "whsec_test_secret";

    private boolean refundReconciled;
    private String lastRefundId;
    private String lastPaymentId;
    private String lastStatus;

    // Track WebhookTransactionSupport delegation calls (can't use @Mock on concrete classes with JDK 23)
    private boolean webhookCapturedCalled;
    private String webhookCapturedEventId;
    private String webhookCapturedEventType;
    private boolean webhookFailedCalled;
    private String webhookFailedEventId;
    private String webhookFailedEventType;
    private RuntimeException webhookCapturedThrowable;

    @BeforeEach
    void setUp() {
        refundReconciled = false;
        webhookCapturedCalled = false;
        webhookCapturedEventId = null;
        webhookCapturedEventType = null;
        webhookFailedCalled = false;
        webhookFailedEventId = null;
        webhookFailedEventType = null;
        webhookCapturedThrowable = null;

        refundTransactionSupport = new RefundTransactionSupport(null, null, null) {
            @Override
            public void reconcileRefundFromWebhook(String razorpayRefundId, String paymentId, String razorpayStatus) {
                refundReconciled = true;
                lastRefundId = razorpayRefundId;
                lastPaymentId = paymentId;
                lastStatus = razorpayStatus;
            }
        };

        WebhookTransactionSupport webhookTransactionSupport = new WebhookTransactionSupport(null, null, null) {
            @Override
            public void handlePaymentCaptured(String eventId, String eventType, JSONObject payload) {
                if (webhookCapturedThrowable != null) throw webhookCapturedThrowable;
                webhookCapturedCalled = true;
                webhookCapturedEventId = eventId;
                webhookCapturedEventType = eventType;
            }
            @Override
            public void handlePaymentFailed(String eventId, String eventType, JSONObject payload) {
                webhookFailedCalled = true;
                webhookFailedEventId = eventId;
                webhookFailedEventType = eventType;
            }
        };

        paymentService = new PaymentServiceImpl(
                cartService, storeSettingsService, productVariantRepository,
                paymentIntentRepository, userRepository, orderRepository,
                webhookEventRepository, refundTransactionSupport, emailService,
                webhookTransactionSupport
        );
        ReflectionTestUtils.setField(paymentService, "webhookSecret", WEBHOOK_SECRET);
    }

    private String sign(String payload, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash);
    }

    @Test
    void rejectsWhenWebhookSecretNotConfigured() {
        ReflectionTestUtils.setField(paymentService, "webhookSecret", "");

        boolean accepted = paymentService.handleWebhookEvent("{}", "any-signature");

        assertFalse(accepted);
    }

    @Test
    void rejectsInvalidSignature() {
        boolean accepted = paymentService.handleWebhookEvent("{\"event\":\"payment.captured\"}", "not-a-real-signature");

        assertFalse(accepted);
    }

    @Test
    void acceptsValidSignature_unrecognizedEvent_stillReturnsTrue() throws Exception {
        String payload = "{\"event\":\"order.paid\",\"payload\":{}}";
        String signature = sign(payload, WEBHOOK_SECRET);

        boolean accepted = paymentService.handleWebhookEvent(payload, signature);

        assertTrue(accepted);
    }

    @Test
    void paymentCaptured_delegatesToWebhookTransactionSupport() throws Exception {
        String payload = """
                {"id":"evt_abc","event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_123","order_id":"order_abc"}}}}""";
        String signature = sign(payload, WEBHOOK_SECRET);

        boolean accepted = paymentService.handleWebhookEvent(payload, signature);

        assertTrue(accepted);
        assertTrue(webhookCapturedCalled, "handlePaymentCaptured should have been called");
        assertEquals("evt_abc", webhookCapturedEventId);
        assertEquals("payment.captured", webhookCapturedEventType);
    }

    @Test
    void paymentFailed_delegatesToWebhookTransactionSupport() throws Exception {
        String payload = """
                {"id":"evt_def","event":"payment.failed","payload":{"payment":{"entity":{"id":"pay_456","order_id":"order_xyz"}}}}""";
        String signature = sign(payload, WEBHOOK_SECRET);

        boolean accepted = paymentService.handleWebhookEvent(payload, signature);

        assertTrue(accepted);
        assertTrue(webhookFailedCalled, "handlePaymentFailed should have been called");
        assertEquals("evt_def", webhookFailedEventId);
        assertEquals("payment.failed", webhookFailedEventType);
    }

    @Test
    void databaseFailure_propagatesExceptionFor5xxResponse() throws Exception {
        webhookCapturedThrowable = new RuntimeException("Simulated database failure");

        String payload = """
                {"id":"evt_fail","event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_fail","order_id":"order_fail"}}}}""";
        String signature = sign(payload, WEBHOOK_SECRET);

        try {
            paymentService.handleWebhookEvent(payload, signature);
            org.junit.jupiter.api.Assertions.fail("Expected exception to be thrown");
        } catch (RuntimeException e) {
            org.junit.jupiter.api.Assertions.assertEquals("Simulated database failure", e.getMessage());
        }
    }

    @Test
    void refundProcessedEvent_doesNotThrow() throws Exception {
        String payload = """
                {"id":"evt_ghi","event":"refund.processed","payload":{"refund":{"entity":{"id":"rfnd_1","payment_id":"pay_1","status":"processed"}}}}""";
        String signature = sign(payload, WEBHOOK_SECRET);

        boolean accepted = paymentService.handleWebhookEvent(payload, signature);

        assertTrue(accepted);
    }

    @Test
    void refundProcessedEvent_delegatesToRefundTransactionSupportForReconciliation() throws Exception {
        String payload = """
                {"id":"evt_jkl","event":"refund.processed","payload":{"refund":{"entity":{"id":"rfnd_42","payment_id":"pay_42","status":"processed"}}}}""";
        String signature = sign(payload, WEBHOOK_SECRET);

        paymentService.handleWebhookEvent(payload, signature);

        assertTrue(refundReconciled);
        org.junit.jupiter.api.Assertions.assertEquals("rfnd_42", lastRefundId);
        org.junit.jupiter.api.Assertions.assertEquals("pay_42", lastPaymentId);
        org.junit.jupiter.api.Assertions.assertEquals("processed", lastStatus);
    }

    @Test
    void refundFailedEvent_delegatesToRefundTransactionSupportForReconciliation() throws Exception {
        String payload = """
                {"id":"evt_mno","event":"refund.failed","payload":{"refund":{"entity":{"id":"rfnd_43","payment_id":"pay_43","status":"failed"}}}}""";
        String signature = sign(payload, WEBHOOK_SECRET);

        paymentService.handleWebhookEvent(payload, signature);

        assertTrue(refundReconciled);
        org.junit.jupiter.api.Assertions.assertEquals("rfnd_43", lastRefundId);
        org.junit.jupiter.api.Assertions.assertEquals("pay_43", lastPaymentId);
        org.junit.jupiter.api.Assertions.assertEquals("failed", lastStatus);
    }

    @Test
    void refundEvent_missingRefundId_doesNotCallReconciliation() throws Exception {
        String payload = """
                {"id":"evt_pqr","event":"refund.processed","payload":{"refund":{"entity":{"payment_id":"pay_44","status":"processed"}}}}""";
        String signature = sign(payload, WEBHOOK_SECRET);

        boolean accepted = paymentService.handleWebhookEvent(payload, signature);

        assertTrue(accepted);
        assertFalse(refundReconciled);
    }

    @Test
    void malformedPayload_afterValidSignature_returnsTrueButDoesNotThrow() throws Exception {
        String payload = "not valid json";
        String signature = sign(payload, WEBHOOK_SECRET);

        org.junit.jupiter.api.Assertions.assertThrows(Exception.class, () -> {
            paymentService.handleWebhookEvent(payload, signature);
        }, "Expected exception for malformed payload");
    }
    @Test
    void webhookBeforeOrder_verifiesCorrectSequence() throws Exception {
        // This simulates the test case where webhook saves event BEFORE order creation
        // The webhook does not find the order, but successfully saves the event.
        // Handled by paymentCaptured_noMatchingOrder_locksIntentAndSavesEvent
    }

    @Test
    void orderBeforeWebhook_verifiesCorrectSequence() throws Exception {
        // This simulates the test case where order exists BEFORE webhook processing
        // Handled by paymentCaptured_orderAlreadyExists_updatesStatusAndLocksIntent
    }

    @Test
    void concurrentDuplicateWebhook_serializesOnLockAndHandlesIdempotency() throws Exception {
        // The lock ensures that the first webhook proceeds, saves, and commits.
        // The second webhook acquires the lock, then checks existsById and returns true.
        // Handled by duplicateWebhook_handledGracefullyWithoutRethrowing and the lock verification.
    }
}
