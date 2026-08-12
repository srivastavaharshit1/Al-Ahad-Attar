package com.alahadattars.service.impl;

import com.alahadattars.dto.order.OrderResponse;
import com.alahadattars.dto.payment.RefundResult;
import com.alahadattars.entity.Address;
import com.alahadattars.entity.Order;
import com.alahadattars.entity.User;
import com.alahadattars.enums.OrderStatus;
import com.alahadattars.enums.PaymentStatus;
import com.alahadattars.enums.RefundStatus;
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.mapper.ProductVariantMapper;
import com.alahadattars.repository.AddressRepository;
import com.alahadattars.repository.CartRepository;
import com.alahadattars.repository.GiftServiceRepository;
import com.alahadattars.repository.OrderRepository;
import com.alahadattars.repository.PaymentIntentRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.PromotionRedemptionRepository;
import com.alahadattars.repository.PromotionRepository;
import com.alahadattars.repository.UserRepository;
import com.alahadattars.service.EmailService;
import com.alahadattars.service.PaymentService;
import com.alahadattars.service.PromotionEngineService;
import com.alahadattars.service.StoreSettingsService;
import com.alahadattars.service.notification.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Covers the orchestration in OrderServiceImpl.cancelOrder / adminCancelOrder / initiateRefund.
 * The underlying business rules (CONFIRMED-only cancellation, atomic claims, inventory restore)
 * live in RefundTransactionSupport and are covered by RefundTransactionSupportTest. This class
 * covers: cancellation NEVER calls Razorpay (business rule — admin controls the actual refund),
 * admin refund success/failure email+notification wiring, and the stuck-PROCESSING reconciliation
 * path in initiateRefund.
 */
@ExtendWith(MockitoExtension.class)
class OrderCancellationServiceTest {

    @Mock private OrderRepository orderRepository;
    @Mock private UserRepository userRepository;
    @Mock private AddressRepository addressRepository;
    @Mock private ProductVariantRepository variantRepository;
    @Mock private ProductVariantMapper variantMapper;
    @Mock private StoreSettingsService storeSettingsService;
    @Mock private NotificationService notificationService;
    @Mock private PaymentService paymentService;
    @Mock private GiftServiceRepository giftServiceRepository;
    @Mock private PromotionEngineService promotionEngineService;
    @Mock private ObjectMapper objectMapper;
    @Mock private PaymentIntentRepository paymentIntentRepository;
    @Mock private CartRepository cartRepository;
    @Mock private PromotionRepository promotionRepository;
    @Mock private PromotionRedemptionRepository promotionRedemptionRepository;
    @Mock private EmailService emailService;
    @Mock private RefundTransactionSupport refundTransactionSupport;

    @InjectMocks
    private OrderServiceImpl orderService;

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
                .status(OrderStatus.CANCELLED)
                .paymentStatus(PaymentStatus.PAID)
                .paymentMethod("ONLINE")
                .transactionId("pay_test123")
                .totalAmount(new BigDecimal("999.00"))
                .refundStatus(RefundStatus.REFUND_REQUIRED)
                .refundAmount(new BigDecimal("999.00"))
                .build();
        order.setId(ORDER_ID);
    }

    // ------------------------------------------------------------------
    // cancelOrder / adminCancelOrder — NEVER call Razorpay
    // ------------------------------------------------------------------

    @Test
    void cancelOrder_neverCallsRazorpay_sendsCancelledEmailOnly() {
        when(refundTransactionSupport.claimCancellationAndPrepareRefund(ORDER_ID, CUSTOMER_EMAIL)).thenReturn(order);

        OrderResponse response = orderService.cancelOrder(CUSTOMER_EMAIL, ORDER_ID);

        assertEquals(OrderStatus.CANCELLED, response.getStatus());
        verify(paymentService, never()).initiateRefund(anyString(), any());
        verify(emailService).sendOrderCancelledEmail(any());
        verify(emailService, never()).sendRefundSuccessfulEmail(any());
        verify(emailService).sendAdminOrderCancelledEmail(any());
    }

    @Test
    void cancelOrder_preparationRejects_propagatesException_neverCallsRazorpay() {
        when(refundTransactionSupport.claimCancellationAndPrepareRefund(ORDER_ID, CUSTOMER_EMAIL))
                .thenThrow(new BadRequestException("This order can no longer be cancelled because it has already been packed."));

        assertThrows(BadRequestException.class, () -> orderService.cancelOrder(CUSTOMER_EMAIL, ORDER_ID));

        verify(paymentService, never()).initiateRefund(anyString(), any());
        verify(emailService, never()).sendOrderCancelledEmail(any());
    }

    @Test
    void adminCancelOrder_neverCallsRazorpay_sendsCancelledEmailOnly() {
        when(refundTransactionSupport.claimAdminCancellation(ORDER_ID, ADMIN_EMAIL)).thenReturn(order);

        OrderResponse response = orderService.adminCancelOrder(ADMIN_EMAIL, ORDER_ID);

        assertEquals(OrderStatus.CANCELLED, response.getStatus());
        verify(paymentService, never()).initiateRefund(anyString(), any());
        verify(emailService).sendOrderCancelledEmail(any());
        verify(emailService).sendAdminOrderCancelledEmail(any());
    }

    @Test
    void adminCancelOrder_preparationRejects_propagatesException() {
        when(refundTransactionSupport.claimAdminCancellation(ORDER_ID, ADMIN_EMAIL))
                .thenThrow(new BadRequestException("This order can no longer be cancelled because it has already been shipped."));

        assertThrows(BadRequestException.class, () -> orderService.adminCancelOrder(ADMIN_EMAIL, ORDER_ID));
        verify(paymentService, never()).initiateRefund(anyString(), any());
    }

    // ------------------------------------------------------------------
    // initiateRefund (admin) orchestration
    // ------------------------------------------------------------------

    @Test
    void initiateRefund_success_callsRazorpaySendsRefundEmailAndNotifiesCustomer() {
        LocalDateTime initiatedAt = LocalDateTime.now();
        when(orderRepository.findById(ORDER_ID)).thenReturn(Optional.of(order));
        when(refundTransactionSupport.claimAdminRefundProcessing(ORDER_ID, ADMIN_EMAIL))
                .thenReturn(new RefundTransactionSupport.AdminRefundPreparation(order, new BigDecimal("999.00"), initiatedAt));
        when(paymentService.initiateRefund(eq("pay_test123"), eq(new BigDecimal("999.00"))))
                .thenReturn(RefundResult.builder().success(true).refundId("rfnd_xyz").build());
        when(refundTransactionSupport.recordAdminRefundOutcome(eq(order), any(RefundResult.class), eq(new BigDecimal("999.00")), eq(initiatedAt)))
                .thenReturn(order);

        orderService.initiateRefund(ADMIN_EMAIL, ORDER_ID);

        verify(paymentService).initiateRefund("pay_test123", new BigDecimal("999.00"));
        verify(emailService).sendRefundSuccessfulEmail(any());
        verify(notificationService).sendRefundCompletedNotification(order);
        verify(emailService, never()).sendAdminRefundFailedEmail(any());
    }

    @Test
    void initiateRefund_failure_sendsAdminFailureEmail_noCustomerNotification() {
        LocalDateTime initiatedAt = LocalDateTime.now();
        when(orderRepository.findById(ORDER_ID)).thenReturn(Optional.of(order));
        when(refundTransactionSupport.claimAdminRefundProcessing(ORDER_ID, ADMIN_EMAIL))
                .thenReturn(new RefundTransactionSupport.AdminRefundPreparation(order, new BigDecimal("999.00"), initiatedAt));
        when(paymentService.initiateRefund(anyString(), any(BigDecimal.class)))
                .thenReturn(RefundResult.builder().success(false).errorMessage("Razorpay error").build());
        when(refundTransactionSupport.recordAdminRefundOutcome(eq(order), any(RefundResult.class), any(), eq(initiatedAt)))
                .thenReturn(order);

        orderService.initiateRefund(ADMIN_EMAIL, ORDER_ID);

        verify(notificationService, never()).sendRefundCompletedNotification(any());
        verify(emailService, never()).sendRefundSuccessfulEmail(any());
        verify(emailService).sendAdminRefundFailedEmail(any());
    }

    @Test
    void initiateRefund_guardRejects_neverCallsRazorpay() {
        order.setStatus(OrderStatus.CONFIRMED);
        order.setRefundStatus(RefundStatus.NOT_REQUIRED);
        when(orderRepository.findById(ORDER_ID)).thenReturn(Optional.of(order));
        when(refundTransactionSupport.claimAdminRefundProcessing(ORDER_ID, ADMIN_EMAIL))
                .thenThrow(new BadRequestException("Refund can only be issued for cancelled orders. Current status: CONFIRMED"));

        assertThrows(BadRequestException.class, () -> orderService.initiateRefund(ADMIN_EMAIL, ORDER_ID));

        verify(paymentService, never()).initiateRefund(anyString(), any());
    }

    // ------------------------------------------------------------------
    // initiateRefund — stuck PROCESSING reconciliation (Case C/D from the business spec)
    // ------------------------------------------------------------------

    @Test
    void initiateRefund_stuckProcessing_razorpayConfirmsSuccess_reconcilesWithoutNewRazorpayCall() {
        order.setRefundStatus(RefundStatus.PROCESSING);
        order.setRefundInitiatedAt(LocalDateTime.now());
        when(orderRepository.findById(ORDER_ID)).thenReturn(Optional.of(order));
        when(paymentService.checkExistingRefund(eq("pay_test123"), eq(new BigDecimal("999.00"))))
                .thenReturn(Optional.of(RefundResult.builder().success(true).refundId("rfnd_reconciled").build()));
        when(refundTransactionSupport.recordAdminRefundOutcome(eq(order), any(RefundResult.class), eq(new BigDecimal("999.00")), any()))
                .thenReturn(order);

        orderService.initiateRefund(ADMIN_EMAIL, ORDER_ID);

        verify(paymentService, never()).initiateRefund(anyString(), any());
        verify(refundTransactionSupport, never()).claimAdminRefundProcessing(anyLong(), anyString());
        verify(emailService).sendRefundSuccessfulEmail(any());
    }

    @Test
    void initiateRefund_stuckProcessing_razorpayOutcomeUnknown_rejectsWithoutChangingState() {
        order.setRefundStatus(RefundStatus.PROCESSING);
        when(orderRepository.findById(ORDER_ID)).thenReturn(Optional.of(order));
        when(paymentService.checkExistingRefund(eq("pay_test123"), eq(new BigDecimal("999.00"))))
                .thenReturn(Optional.empty());

        assertThrows(BadRequestException.class, () -> orderService.initiateRefund(ADMIN_EMAIL, ORDER_ID));

        verify(paymentService, never()).initiateRefund(anyString(), any());
        verify(refundTransactionSupport, never()).recordAdminRefundOutcome(any(), any(), any(), any());
    }
}
