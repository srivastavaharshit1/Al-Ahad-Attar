package com.alahadattars.dto.order;

import com.alahadattars.dto.profile.AddressResponse;
import com.alahadattars.enums.OrderStatus;
import com.alahadattars.enums.PaymentStatus;
import com.alahadattars.enums.RefundStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {

    private Long id;
    private String orderNumber;
    private AddressResponse shippingAddress;
    private BigDecimal totalAmount;
    private BigDecimal shippingCost;
    private BigDecimal offerDiscountAmount;
    private BigDecimal couponDiscountAmount;
    private OrderStatus status;
    private PaymentStatus paymentStatus;
    private String paymentMethod;
    private String transactionId;
    private String notes;
    private String courierName;
    private String trackingNumber;
    private java.time.LocalDate expectedDeliveryDate;
    private String shipmentNotes;
    private Long giftServiceId;
    private String giftServiceName;
    private java.math.BigDecimal giftServicePrice;
    private String giftMessage;
    private List<OrderItemResponse> items;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Refund fields
    private RefundStatus refundStatus;
    private String refundId;
    private BigDecimal refundAmount;
    private LocalDateTime refundInitiatedAt;
    private LocalDateTime refundCompletedAt;
    private String refundFailureReason;
    private String refundInitiatedBy;
}
