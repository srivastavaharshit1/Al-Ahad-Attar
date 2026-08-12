package com.alahadattars.service.impl;

import com.alahadattars.entity.PaymentIntent;
import com.alahadattars.entity.User;
import com.alahadattars.repository.CartRepository;
import com.alahadattars.repository.GiftServiceRepository;
import com.alahadattars.repository.OrderRepository;
import com.alahadattars.repository.PaymentIntentRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.UserRepository;
import com.alahadattars.service.CartService;
import com.alahadattars.service.StoreSettingsService;
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
    @Mock private GiftServiceRepository giftServiceRepository;
    @Mock private PaymentIntentRepository paymentIntentRepository;
    @Mock private UserRepository userRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private CartRepository cartRepository;
    @Mock private RefundTransactionSupport refundTransactionSupport;

    @InjectMocks
    private PaymentServiceImpl paymentService;

    private static final String WEBHOOK_SECRET = "whsec_test_secret";

    @BeforeEach
    void setUp() {
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
    void paymentCaptured_orderAlreadyExists_noReconciliationNeeded() throws Exception {
        String payload = """
                {"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_123","order_id":"order_abc"}}}}""";
        String signature = sign(payload, WEBHOOK_SECRET);
        when(orderRepository.existsByTransactionId("pay_123")).thenReturn(true);

        boolean accepted = paymentService.handleWebhookEvent(payload, signature);

        assertTrue(accepted);
        verify(paymentIntentRepository, never()).findByRazorpayOrderId(any());
    }

    @Test
    void paymentCaptured_noMatchingOrder_looksUpPaymentIntentForReconciliation() throws Exception {
        String payload = """
                {"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_456","order_id":"order_xyz"}}}}""";
        String signature = sign(payload, WEBHOOK_SECRET);
        when(orderRepository.existsByTransactionId("pay_456")).thenReturn(false);

        User user = User.builder().email("stuck-customer@example.com").build();
        PaymentIntent intent = PaymentIntent.builder().razorpayOrderId("order_xyz").user(user).amount(new BigDecimal("999.00")).build();
        when(paymentIntentRepository.findByRazorpayOrderId("order_xyz")).thenReturn(Optional.of(intent));

        boolean accepted = paymentService.handleWebhookEvent(payload, signature);

        assertTrue(accepted);
        verify(paymentIntentRepository).findByRazorpayOrderId("order_xyz");
    }

    @Test
    void refundProcessedEvent_doesNotThrow() throws Exception {
        String payload = """
                {"event":"refund.processed","payload":{"refund":{"entity":{"id":"rfnd_1","payment_id":"pay_1","status":"processed"}}}}""";
        String signature = sign(payload, WEBHOOK_SECRET);

        boolean accepted = paymentService.handleWebhookEvent(payload, signature);

        assertTrue(accepted);
    }

    @Test
    void refundProcessedEvent_delegatesToRefundTransactionSupportForReconciliation() throws Exception {
        String payload = """
                {"event":"refund.processed","payload":{"refund":{"entity":{"id":"rfnd_42","payment_id":"pay_42","status":"processed"}}}}""";
        String signature = sign(payload, WEBHOOK_SECRET);

        paymentService.handleWebhookEvent(payload, signature);

        verify(refundTransactionSupport).reconcileRefundFromWebhook("rfnd_42", "pay_42", "processed");
    }

    @Test
    void refundFailedEvent_delegatesToRefundTransactionSupportForReconciliation() throws Exception {
        String payload = """
                {"event":"refund.failed","payload":{"refund":{"entity":{"id":"rfnd_43","payment_id":"pay_43","status":"failed"}}}}""";
        String signature = sign(payload, WEBHOOK_SECRET);

        paymentService.handleWebhookEvent(payload, signature);

        verify(refundTransactionSupport).reconcileRefundFromWebhook("rfnd_43", "pay_43", "failed");
    }

    @Test
    void refundEvent_missingRefundId_doesNotCallReconciliation() throws Exception {
        String payload = """
                {"event":"refund.processed","payload":{"refund":{"entity":{"payment_id":"pay_44","status":"processed"}}}}""";
        String signature = sign(payload, WEBHOOK_SECRET);

        boolean accepted = paymentService.handleWebhookEvent(payload, signature);

        assertTrue(accepted);
        verify(refundTransactionSupport, never()).reconcileRefundFromWebhook(any(), any(), any());
    }

    @Test
    void malformedPayload_afterValidSignature_returnsTrueButDoesNotThrow() throws Exception {
        String payload = "not valid json";
        String signature = sign(payload, WEBHOOK_SECRET);

        boolean accepted = paymentService.handleWebhookEvent(payload, signature);

        assertTrue(accepted);
    }
}
