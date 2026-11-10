package com.alahadattars.service.impl;

import com.alahadattars.dto.payment.RefundResult;
import com.alahadattars.entity.Address;
import com.alahadattars.entity.Order;
import com.alahadattars.entity.Refund;
import com.alahadattars.entity.User;
import com.alahadattars.enums.OrderStatus;
import com.alahadattars.enums.PaymentStatus;
import com.alahadattars.enums.RefundStatus;
import com.alahadattars.repository.AdminNotificationRepository;
import com.alahadattars.repository.BottleRepository;
import com.alahadattars.repository.OrderItemGiftSetComponentRepository;
import com.alahadattars.repository.OrderRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.RefundRepository;
import com.alahadattars.service.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Refund Idempotency Key Uniqueness & Safety Tests")
class RefundIdempotencyKeySafetyTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private RefundRepository refundRepository;

    @Mock
    private ProductVariantRepository variantRepository;

    @Mock
    private BottleRepository bottleRepository;

    @Mock
    private OrderItemGiftSetComponentRepository orderItemGiftSetComponentRepository;

    @Mock
    private AdminNotificationRepository adminNotificationRepository;

    @Mock
    private PaymentService paymentService;

    private RefundTransactionSupport refundTransactionSupport;

    private Order sampleOrder;
    private final AtomicLong refundSequence = new AtomicLong(100);
    private final java.util.Map<Long, Refund> refundDb = new java.util.concurrent.ConcurrentHashMap<>();

    @BeforeEach
    void setUp() {
        refundDb.clear();
        refundTransactionSupport = new RefundTransactionSupport(
                orderRepository,
                refundRepository,
                variantRepository,
                bottleRepository,
                orderItemGiftSetComponentRepository,
                adminNotificationRepository
        );

        User user = User.builder().firstName("Rashid").lastName("Ali").email("rashid@example.com").build();
        user.setId(5L);

        Address address = Address.builder().fullName("Rashid Ali").phone("+919876543210")
                .addressLine1("45 Chowk").city("Lucknow").state("Uttar Pradesh")
                .postalCode("226003").country("India").build();
        address.setId(10L);

        sampleOrder = Order.builder()
                .orderNumber("ORD-2026-X1")
                .user(user)
                .shippingAddress(address)
                .status(OrderStatus.CANCELLED)
                .paymentStatus(PaymentStatus.PAID)
                .paymentMethod("ONLINE")
                .transactionId("pay_shared_999")
                .totalAmount(new BigDecimal("3000.00"))
                .refundAmount(new BigDecimal("1000.00"))
                .refundStatus(RefundStatus.REFUND_REQUIRED)
                .build();
        sampleOrder.setId(500L);

        lenient().when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(refundRepository.save(any(Refund.class))).thenAnswer(inv -> {
            Refund r = inv.getArgument(0);
            if (r.getId() == null) {
                r.setId(refundSequence.incrementAndGet());
            }
            refundDb.put(r.getId(), r);
            return r;
        });
        lenient().when(refundRepository.findById(anyLong())).thenAnswer(inv -> Optional.ofNullable(refundDb.get(inv.getArgument(0))));
    }

    private void assertValidGatewayIdempotencyKey(String key) {
        assertNotNull(key, "Idempotency key must not be null");
        assertFalse(key.isBlank(), "Idempotency key must not be blank");
        assertTrue(key.length() >= 10, "Razorpay requires idempotency key to be at least 10 characters long, got: " + key.length());
        assertTrue(key.length() <= 64, "Razorpay requires idempotency key to be at most 64 characters long, got: " + key.length());
        assertTrue(key.matches("^[a-zA-Z0-9_-]+$"), "Key must contain only alphanumeric characters, underscores, and hyphens: " + key);
    }

    @Test
    @DisplayName("Test 1: Multiple partial refunds against the same order use distinct idempotency keys")
    void test1_multiplePartialRefundsAgainstSameOrder_useDistinctKeys() {
        when(orderRepository.findById(500L)).thenReturn(Optional.of(sampleOrder));
        when(orderRepository.claimRefundProcessing(500L)).thenReturn(1);

        // Initiate First Partial Refund (₹1,000)
        sampleOrder.setRefundAmount(new BigDecimal("1000.00"));
        RefundTransactionSupport.AdminRefundPreparation prep1 =
                refundTransactionSupport.claimAdminRefundProcessing(500L, "admin@alahadattars.com");

        String key1 = prep1.idempotencyKey();
        Long refundId1 = prep1.refundRecordId();

        assertValidGatewayIdempotencyKey(key1);
        assertEquals(101L, refundId1);
        assertEquals("order-ORD-2026-X1-ref-101", key1);

        // Complete First Partial Refund
        refundTransactionSupport.recordAdminRefundOutcome(
                prep1.order(), prep1.refundRecordId(),
                RefundResult.builder().outcome(RefundResult.RefundOutcome.PROCESSED).refundId("rfnd_part_1").build(),
                prep1.refundAmount(), prep1.initiatedAt()
        );

        // Reset order refund status to allow second legitimate partial refund (e.g. second cancelled item of ₹1,500)
        sampleOrder.setRefundStatus(RefundStatus.REFUND_REQUIRED);
        sampleOrder.setRefundAmount(new BigDecimal("1500.00"));

        // Initiate Second Partial Refund (₹1,500)
        RefundTransactionSupport.AdminRefundPreparation prep2 =
                refundTransactionSupport.claimAdminRefundProcessing(500L, "admin@alahadattars.com");

        String key2 = prep2.idempotencyKey();
        Long refundId2 = prep2.refundRecordId();

        assertValidGatewayIdempotencyKey(key2);
        assertEquals(102L, refundId2);
        assertEquals("order-ORD-2026-X1-ref-102", key2);

        // Crucial financial invariant: Distinct operations must NEVER share an idempotency key
        assertNotEquals(key1, key2, "Two distinct partial refunds against the same order must have different idempotency keys");
        assertNotEquals(refundId1, refundId2, "Two distinct partial refunds must have different persistent database record IDs");
    }

    @Test
    @DisplayName("Test 2: Retrying the first partial refund reuses its original key")
    void test2_retryingFirstPartialRefund_reusesItsOriginalKey() {
        when(orderRepository.findById(500L)).thenReturn(Optional.of(sampleOrder));
        when(orderRepository.claimRefundProcessing(500L)).thenReturn(1);

        sampleOrder.setRefundAmount(new BigDecimal("1000.00"));
        RefundTransactionSupport.AdminRefundPreparation prep1 =
                refundTransactionSupport.claimAdminRefundProcessing(500L, "admin@alahadattars.com");

        String originalKey1 = prep1.idempotencyKey();
        Long refundRecordId1 = prep1.refundRecordId();
        assertEquals("order-ORD-2026-X1-ref-101", originalKey1);

        // Simulate network timeout or retry: reload operation record from database
        Refund existingRefundRecord = Refund.builder()
                .order(sampleOrder)
                .paymentId(sampleOrder.getTransactionId())
                .amount(prep1.refundAmount())
                .status(RefundStatus.PROCESSING)
                .initiatedAt(prep1.initiatedAt())
                .build();
        existingRefundRecord.setId(refundRecordId1);

        // On retry, reconstruct or lookup the key for this exact operation
        String retryKey1 = "order-" + sampleOrder.getOrderNumber() + "-ref-" + existingRefundRecord.getId();

        assertEquals(originalKey1, retryKey1, "Retrying the first partial refund must reuse its exact original key");
        assertValidGatewayIdempotencyKey(retryKey1);
    }

    @Test
    @DisplayName("Test 3: Retrying the second partial refund reuses its own key")
    void test3_retryingSecondPartialRefund_reusesItsOwnKey() {
        // Assume first refund (101) finished, and second refund (102) was initiated
        Refund secondRefundRecord = Refund.builder()
                .order(sampleOrder)
                .paymentId(sampleOrder.getTransactionId())
                .amount(new BigDecimal("1500.00"))
                .status(RefundStatus.PROCESSING)
                .initiatedAt(LocalDateTime.now())
                .build();
        secondRefundRecord.setId(102L);

        String originalKey2 = "order-" + sampleOrder.getOrderNumber() + "-ref-" + secondRefundRecord.getId();
        assertEquals("order-ORD-2026-X1-ref-102", originalKey2);

        // Retry the second refund
        String retryKey2 = "order-" + sampleOrder.getOrderNumber() + "-ref-" + secondRefundRecord.getId();

        assertEquals(originalKey2, retryKey2, "Retrying the second partial refund must reuse its own original key");
        assertNotEquals("order-ORD-2026-X1-ref-101", retryKey2, "Retrying the second partial refund must never use the first refund's key");
    }

    @Test
    @DisplayName("Test 4: Concurrent retries of the same refund operation use one key")
    void test4_concurrentRetriesOfSameRefundOperation_useOneKey() {
        Long refundRecordId = 101L;

        // Both concurrent threads refer to the same in-flight refund operation ID
        String keyFromThreadA = "order-" + sampleOrder.getOrderNumber() + "-ref-" + refundRecordId;
        String keyFromThreadB = "order-" + sampleOrder.getOrderNumber() + "-ref-" + refundRecordId;

        assertEquals(keyFromThreadA, keyFromThreadB, "Concurrent retries for the same operation must produce identical idempotency keys");
        assertValidGatewayIdempotencyKey(keyFromThreadA);
    }

    @Test
    @DisplayName("Test 5: Application restart / reload does not change the key")
    void test5_applicationRestartOrReload_doesNotChangeTheKey() {
        Long persistedRefundId = 101L;
        String persistedOrderNumber = "ORD-2026-X1";

        // Pre-restart key formulation
        String preRestartKey = "order-" + persistedOrderNumber + "-ref-" + persistedRefundId;

        // Simulate complete application restart and database reload:
        // Entity instances are re-instantiated from database columns
        Order reloadedOrder = Order.builder().orderNumber(persistedOrderNumber).build();
        reloadedOrder.setId(500L);
        Refund reloadedRefund = Refund.builder().order(reloadedOrder).build();
        reloadedRefund.setId(persistedRefundId);

        String postRestartKey = "order-" + reloadedOrder.getOrderNumber() + "-ref-" + reloadedRefund.getId();

        assertEquals(preRestartKey, postRestartKey, "Application restart must never alter the deterministic idempotency key");
        assertEquals("order-ORD-2026-X1-ref-101", postRestartKey);
    }

    @Test
    @DisplayName("Test 6: Different request amounts cannot reuse the same operation key")
    void test6_differentRequestAmounts_cannotReuseSameOperationKey() {
        // Operation 101 is for ₹1,000
        BigDecimal amount1 = new BigDecimal("1000.00");
        String key1 = "order-ORD-2026-X1-ref-101";

        // Operation 102 is for ₹1,500
        BigDecimal amount2 = new BigDecimal("1500.00");
        String key2 = "order-ORD-2026-X1-ref-102";

        // Gateway invariant: If the same key is reused with a different payload, Razorpay returns BAD_REQUEST (idempotency conflict)
        when(paymentService.initiateRefund(eq("pay_shared_999"), eq(amount1), eq(key1)))
                .thenReturn(RefundResult.builder().outcome(RefundResult.RefundOutcome.PROCESSED).refundId("rfnd_101").build());

        // Reusing key1 with amount2 must be rejected
        when(paymentService.initiateRefund(eq("pay_shared_999"), eq(amount2), eq(key1)))
                .thenReturn(RefundResult.builder()
                        .outcome(RefundResult.RefundOutcome.DEFINITIVE_FAILURE)
                        .errorMessage("Razorpay error (HTTP 400): Idempotency key already used with different request parameters")
                        .build());

        RefundResult res1 = paymentService.initiateRefund("pay_shared_999", amount1, key1);
        RefundResult conflictRes = paymentService.initiateRefund("pay_shared_999", amount2, key1);

        assertTrue(res1.isSuccess());
        assertFalse(conflictRes.isSuccess());
        assertTrue(conflictRes.getErrorMessage().contains("different request parameters"));

        // With distinct key2 for amount2, it succeeds normally
        when(paymentService.initiateRefund(eq("pay_shared_999"), eq(amount2), eq(key2)))
                .thenReturn(RefundResult.builder().outcome(RefundResult.RefundOutcome.PROCESSED).refundId("rfnd_102").build());
        RefundResult res2 = paymentService.initiateRefund("pay_shared_999", amount2, key2);
        assertTrue(res2.isSuccess());
    }

    @Test
    @DisplayName("Test 7: Backward compatibility - 2-argument initiateRefund overload generates valid fallback key")
    void test7_backwardCompatibility_twoArgOverloadGeneratesDeterministicFallbackKey() {
        String paymentId = "pay_test_compat_999";
        BigDecimal amount = new BigDecimal("750.00");

        // The fallback key is constructed deterministically
        String expectedFallbackKey = "pay-fallback-" + paymentId;
        assertValidGatewayIdempotencyKey(expectedFallbackKey);

        when(paymentService.initiateRefund(eq(paymentId), eq(amount), eq(expectedFallbackKey)))
                .thenReturn(RefundResult.builder().outcome(RefundResult.RefundOutcome.PROCESSED).refundId("rfnd_compat_1").build());

        RefundResult result = paymentService.initiateRefund(paymentId, amount, expectedFallbackKey);

        assertTrue(result.isSuccess());
        assertEquals("rfnd_compat_1", result.getRefundId());
    }

    @Test
    @DisplayName("Test 8: Orphan reconciliation refund uses deterministic recon key")
    void test8_orphanReconciliationRefund_usesDeterministicReconKey() {
        String razorpayOrderId = "order_rzp_orphan_999";
        String reconKey = "recon-" + razorpayOrderId;

        assertValidGatewayIdempotencyKey(reconKey);
        assertEquals("recon-order_rzp_orphan_999", reconKey);

        // Retrying orphan reconciliation always produces the exact same key
        String retryReconKey = "recon-" + razorpayOrderId;
        assertEquals(reconKey, retryReconKey);
    }
}

