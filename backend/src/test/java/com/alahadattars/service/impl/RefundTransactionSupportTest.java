package com.alahadattars.service.impl;

import com.alahadattars.dto.payment.RefundResult;
import com.alahadattars.entity.Address;
import com.alahadattars.entity.Order;
import com.alahadattars.entity.OrderItem;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.Refund;
import com.alahadattars.entity.User;
import com.alahadattars.enums.OrderStatus;
import com.alahadattars.enums.PaymentStatus;
import com.alahadattars.enums.RefundStatus;
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.repository.OrderRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.RefundRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Covers the business rules that live in RefundTransactionSupport: the CONFIRMED-only
 * cancellation rule (for both customer and admin actors), the atomic claim guards, inventory
 * restoration, recording admin refund outcomes, and webhook-driven reconciliation. Cancellation
 * NEVER calls Razorpay — it only ever flags a paid order's refund as REFUND_REQUIRED; the actual
 * Razorpay call only ever happens from OrderServiceImpl's admin refund flow.
 */
@ExtendWith(MockitoExtension.class)
class RefundTransactionSupportTest {

    @Mock private OrderRepository orderRepository;
    @Mock private RefundRepository refundRepository;
    @Mock private ProductVariantRepository variantRepository;

    @InjectMocks
    private RefundTransactionSupport support;

    private static final String CUSTOMER_EMAIL = "customer@example.com";
    private static final String ADMIN_EMAIL = "admin@alahadattars.com";
    private static final Long ORDER_ID = 100L;

    private Order order;

    @BeforeEach
    void setUp() {
        User user = User.builder().firstName("Test").lastName("Customer").email(CUSTOMER_EMAIL).build();
        user.setId(1L);
        Address address = Address.builder().fullName("Test Customer").phone("+919876543210")
                .addressLine1("123 Test Street").city("Lucknow").state("Uttar Pradesh")
                .postalCode("226001").country("India").build();
        address.setId(1L);

        order = Order.builder()
                .orderNumber("ORD-TEST001")
                .user(user)
                .shippingAddress(address)
                .status(OrderStatus.CONFIRMED)
                .paymentStatus(PaymentStatus.PAID)
                .paymentMethod("ONLINE")
                .transactionId("pay_test123")
                .totalAmount(new BigDecimal("999.00"))
                .build();
        order.setId(ORDER_ID);
    }

    private void stubSaves() {
        org.mockito.Mockito.lenient().when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        org.mockito.Mockito.lenient().when(refundRepository.save(any(Refund.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ------------------------------------------------------------------
    // claimCancellationAndPrepareRefund (customer)
    // ------------------------------------------------------------------

    @Test
    void claimCancellation_confirmedPaidOrder_flagsRefundRequired_neverCallsRazorpay() {
        when(orderRepository.findByIdAndUserEmail(ORDER_ID, CUSTOMER_EMAIL)).thenReturn(Optional.of(order));
        when(orderRepository.claimCancellation(ORDER_ID)).thenReturn(1);
        stubSaves();

        Order result = support.claimCancellationAndPrepareRefund(ORDER_ID, CUSTOMER_EMAIL);

        assertEquals(OrderStatus.CANCELLED, result.getStatus());
        assertEquals(RefundStatus.REFUND_REQUIRED, result.getRefundStatus());
        assertEquals(new BigDecimal("999.00"), result.getRefundAmount());
        assertEquals(CUSTOMER_EMAIL, result.getCancelledBy());
        assertNotNull(result.getCancelledAt());
        verify(refundRepository, never()).save(any());
    }

    @Test
    void claimCancellation_unpaidOrder_noRefundNeeded_marksNotRequired() {
        order.setPaymentStatus(PaymentStatus.PENDING);
        when(orderRepository.findByIdAndUserEmail(ORDER_ID, CUSTOMER_EMAIL)).thenReturn(Optional.of(order));
        when(orderRepository.claimCancellation(ORDER_ID)).thenReturn(1);
        stubSaves();

        Order result = support.claimCancellationAndPrepareRefund(ORDER_ID, CUSTOMER_EMAIL);

        assertEquals(RefundStatus.NOT_REQUIRED, result.getRefundStatus());
    }

    @Test
    void claimCancellation_packedOrder_rejectedWithClearMessage() {
        order.setStatus(OrderStatus.PACKED);
        when(orderRepository.findByIdAndUserEmail(ORDER_ID, CUSTOMER_EMAIL)).thenReturn(Optional.of(order));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> support.claimCancellationAndPrepareRefund(ORDER_ID, CUSTOMER_EMAIL));
        assertTrue(ex.getMessage().toLowerCase().contains("packed"));
        verify(orderRepository, never()).claimCancellation(anyLong());
    }

    @Test
    void claimCancellation_shippedOrder_rejectedWithClearMessage() {
        order.setStatus(OrderStatus.SHIPPED);
        when(orderRepository.findByIdAndUserEmail(ORDER_ID, CUSTOMER_EMAIL)).thenReturn(Optional.of(order));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> support.claimCancellationAndPrepareRefund(ORDER_ID, CUSTOMER_EMAIL));
        assertTrue(ex.getMessage().toLowerCase().contains("shipped"));
    }

    @Test
    void claimCancellation_deliveredOrder_rejectedWithClearMessage() {
        order.setStatus(OrderStatus.DELIVERED);
        when(orderRepository.findByIdAndUserEmail(ORDER_ID, CUSTOMER_EMAIL)).thenReturn(Optional.of(order));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> support.claimCancellationAndPrepareRefund(ORDER_ID, CUSTOMER_EMAIL));
        assertTrue(ex.getMessage().toLowerCase().contains("delivered"));
    }

    @Test
    void claimCancellation_alreadyCancelled_rejectedWithClearMessage() {
        order.setStatus(OrderStatus.CANCELLED);
        when(orderRepository.findByIdAndUserEmail(ORDER_ID, CUSTOMER_EMAIL)).thenReturn(Optional.of(order));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> support.claimCancellationAndPrepareRefund(ORDER_ID, CUSTOMER_EMAIL));
        assertTrue(ex.getMessage().toLowerCase().contains("already been cancelled"));
    }

    @Test
    void claimCancellation_concurrentDuplicateRequest_claimReturnsZero_throws() {
        when(orderRepository.findByIdAndUserEmail(ORDER_ID, CUSTOMER_EMAIL)).thenReturn(Optional.of(order));
        when(orderRepository.claimCancellation(ORDER_ID)).thenReturn(0);

        assertThrows(BadRequestException.class,
                () -> support.claimCancellationAndPrepareRefund(ORDER_ID, CUSTOMER_EMAIL));
    }

    @Test
    void claimCancellation_orderNotFound_throwsResourceNotFoundException() {
        when(orderRepository.findByIdAndUserEmail(999L, CUSTOMER_EMAIL)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> support.claimCancellationAndPrepareRefund(999L, CUSTOMER_EMAIL));
    }

    @Test
    void claimCancellation_restoresInventoryForEveryItem() {
        ProductVariant variant = ProductVariant.builder().stock(10).build();
        variant.setId(5L);
        OrderItem item = OrderItem.builder().variant(variant).quantity(3)
                .productName("Test Attar").variantSize("10ml").unitPrice(new BigDecimal("100")).build();
        item.setId(1L);
        order.setItems(List.of(item));
        order.setPaymentStatus(PaymentStatus.PENDING);

        when(orderRepository.findByIdAndUserEmail(ORDER_ID, CUSTOMER_EMAIL)).thenReturn(Optional.of(order));
        when(orderRepository.claimCancellation(ORDER_ID)).thenReturn(1);
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        support.claimCancellationAndPrepareRefund(ORDER_ID, CUSTOMER_EMAIL);

        verify(variantRepository).incrementStock(5L, 3);
    }

    // ------------------------------------------------------------------
    // claimAdminCancellation — identical rule, no ownership restriction
    // ------------------------------------------------------------------

    @Test
    void claimAdminCancellation_confirmedPaidOrder_flagsRefundRequired_recordsAdminAsCanceller() {
        when(orderRepository.findById(ORDER_ID)).thenReturn(Optional.of(order));
        when(orderRepository.claimCancellation(ORDER_ID)).thenReturn(1);
        stubSaves();

        Order result = support.claimAdminCancellation(ORDER_ID, ADMIN_EMAIL);

        assertEquals(OrderStatus.CANCELLED, result.getStatus());
        assertEquals(RefundStatus.REFUND_REQUIRED, result.getRefundStatus());
        assertEquals(ADMIN_EMAIL, result.getCancelledBy());
    }

    @Test
    void claimAdminCancellation_packedOrder_rejected_samePackedCutoffAsCustomer() {
        order.setStatus(OrderStatus.PACKED);
        when(orderRepository.findById(ORDER_ID)).thenReturn(Optional.of(order));

        BadRequestException ex = assertThrows(BadRequestException.class,
                () -> support.claimAdminCancellation(ORDER_ID, ADMIN_EMAIL));
        assertTrue(ex.getMessage().toLowerCase().contains("packed"));
        verify(orderRepository, never()).claimCancellation(anyLong());
    }

    @Test
    void claimAdminCancellation_concurrentClaim_returnsZero_throws() {
        when(orderRepository.findById(ORDER_ID)).thenReturn(Optional.of(order));
        when(orderRepository.claimCancellation(ORDER_ID)).thenReturn(0);

        assertThrows(BadRequestException.class, () -> support.claimAdminCancellation(ORDER_ID, ADMIN_EMAIL));
    }

    @Test
    void claimAdminCancellation_orderNotFound_throwsResourceNotFoundException() {
        when(orderRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> support.claimAdminCancellation(999L, ADMIN_EMAIL));
    }

    // ------------------------------------------------------------------
    // claimAdminRefundProcessing / recordAdminRefundOutcome
    // ------------------------------------------------------------------

    @Test
    void claimAdminRefund_cancelledPaidOrder_claimsProcessing() {
        order.setStatus(OrderStatus.CANCELLED);
        order.setRefundStatus(RefundStatus.REFUND_REQUIRED);
        when(orderRepository.findById(ORDER_ID)).thenReturn(Optional.of(order));
        when(orderRepository.claimRefundProcessing(ORDER_ID)).thenReturn(1);
        stubSaves();

        RefundTransactionSupport.AdminRefundPreparation prep = support.claimAdminRefundProcessing(ORDER_ID, ADMIN_EMAIL);

        assertEquals(RefundStatus.PROCESSING, order.getRefundStatus());
        assertEquals(ADMIN_EMAIL, order.getRefundInitiatedBy());
        assertEquals(new BigDecimal("999.00"), prep.refundAmount());
    }

    @Test
    void claimAdminRefund_notCancelled_rejected() {
        order.setStatus(OrderStatus.CONFIRMED);
        when(orderRepository.findById(ORDER_ID)).thenReturn(Optional.of(order));

        assertThrows(BadRequestException.class, () -> support.claimAdminRefundProcessing(ORDER_ID, ADMIN_EMAIL));
        verify(orderRepository, never()).claimRefundProcessing(anyLong());
    }

    @Test
    void claimAdminRefund_alreadyRefunded_rejected() {
        order.setStatus(OrderStatus.CANCELLED);
        order.setRefundStatus(RefundStatus.REFUNDED);
        when(orderRepository.findById(ORDER_ID)).thenReturn(Optional.of(order));

        assertThrows(BadRequestException.class, () -> support.claimAdminRefundProcessing(ORDER_ID, ADMIN_EMAIL));
    }

    @Test
    void claimAdminRefund_concurrentClaim_returnsZero_throws() {
        order.setStatus(OrderStatus.CANCELLED);
        when(orderRepository.findById(ORDER_ID)).thenReturn(Optional.of(order));
        when(orderRepository.claimRefundProcessing(ORDER_ID)).thenReturn(0);

        assertThrows(BadRequestException.class, () -> support.claimAdminRefundProcessing(ORDER_ID, ADMIN_EMAIL));
    }

    @Test
    void recordAdminRefundOutcome_success_marksRefundedAndReturnsSavedOrder() {
        stubSaves();
        RefundResult result = RefundResult.builder().success(true).refundId("rfnd_xyz").build();

        Order saved = support.recordAdminRefundOutcome(order, result, new BigDecimal("999.00"), java.time.LocalDateTime.now());

        assertEquals(RefundStatus.REFUNDED, saved.getRefundStatus());
        assertEquals("rfnd_xyz", saved.getRefundId());
        ArgumentCaptor<Refund> captor = ArgumentCaptor.forClass(Refund.class);
        verify(refundRepository).save(captor.capture());
        assertEquals(RefundStatus.REFUNDED, captor.getValue().getStatus());
    }

    @Test
    void recordAdminRefundOutcome_failure_marksFailed() {
        stubSaves();
        RefundResult result = RefundResult.builder().success(false).errorMessage("Razorpay error: Gateway timeout").build();

        Order saved = support.recordAdminRefundOutcome(order, result, new BigDecimal("999.00"), java.time.LocalDateTime.now());

        assertEquals(RefundStatus.FAILED, saved.getRefundStatus());
        assertEquals("Razorpay error: Gateway timeout", saved.getRefundFailureReason());
    }

    // ------------------------------------------------------------------
    // reconcileRefundFromWebhook
    // ------------------------------------------------------------------

    @Test
    void reconcileWebhook_processedEvent_matchedByRefundId_marksRefunded() {
        order.setStatus(OrderStatus.CANCELLED);
        order.setRefundStatus(RefundStatus.PROCESSING);
        order.setRefundAmount(new BigDecimal("999.00"));
        when(orderRepository.findByRefundId("rfnd_1")).thenReturn(Optional.of(order));
        stubSaves();

        support.reconcileRefundFromWebhook("rfnd_1", "pay_test123", "processed");

        assertEquals(RefundStatus.REFUNDED, order.getRefundStatus());
        assertEquals("rfnd_1", order.getRefundId());
        verify(orderRepository).save(order);
        verify(refundRepository).save(any(Refund.class));
    }

    @Test
    void reconcileWebhook_processedEvent_fallsBackToStuckProcessingLookup() {
        order.setStatus(OrderStatus.CANCELLED);
        order.setRefundStatus(RefundStatus.PROCESSING);
        when(orderRepository.findByRefundId("rfnd_2")).thenReturn(Optional.empty());
        when(orderRepository.findByTransactionIdAndRefundStatus("pay_test123", RefundStatus.PROCESSING))
                .thenReturn(Optional.of(order));
        stubSaves();

        support.reconcileRefundFromWebhook("rfnd_2", "pay_test123", "processed");

        assertEquals(RefundStatus.REFUNDED, order.getRefundStatus());
    }

    @Test
    void reconcileWebhook_failedEvent_marksFailed() {
        order.setStatus(OrderStatus.CANCELLED);
        order.setRefundStatus(RefundStatus.PROCESSING);
        when(orderRepository.findByRefundId("rfnd_3")).thenReturn(Optional.empty());
        when(orderRepository.findByTransactionIdAndRefundStatus("pay_test123", RefundStatus.PROCESSING))
                .thenReturn(Optional.of(order));
        stubSaves();

        support.reconcileRefundFromWebhook("rfnd_3", "pay_test123", "failed");

        assertEquals(RefundStatus.FAILED, order.getRefundStatus());
        assertNull(order.getRefundId());
    }

    @Test
    void reconcileWebhook_noMatchingOrder_isNoOp() {
        when(orderRepository.findByRefundId("rfnd_4")).thenReturn(Optional.empty());
        when(orderRepository.findByTransactionIdAndRefundStatus("pay_unknown", RefundStatus.PROCESSING))
                .thenReturn(Optional.empty());

        support.reconcileRefundFromWebhook("rfnd_4", "pay_unknown", "processed");

        verify(orderRepository, never()).save(any());
    }

    @Test
    void reconcileWebhook_alreadyRefunded_isNoOp_doesNotOverwrite() {
        order.setRefundStatus(RefundStatus.REFUNDED);
        order.setRefundId("rfnd_original");
        when(orderRepository.findByRefundId("rfnd_5")).thenReturn(Optional.of(order));

        support.reconcileRefundFromWebhook("rfnd_5", "pay_test123", "processed");

        assertEquals("rfnd_original", order.getRefundId());
        verify(orderRepository, never()).save(any());
    }
}
