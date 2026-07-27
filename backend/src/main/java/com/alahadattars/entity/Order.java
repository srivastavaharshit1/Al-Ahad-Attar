package com.alahadattars.entity;

import com.alahadattars.enums.OrderStatus;
import com.alahadattars.enums.PaymentStatus;
import com.alahadattars.enums.RefundStatus;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "orders", // 'order' is a reserved keyword in SQL
    indexes = {
        @Index(name = "idx_order_user_id", columnList = "user_id"),
        @Index(name = "idx_order_number", columnList = "order_number", unique = true)
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class Order extends BaseEntity {

    @NotBlank
    @Column(name = "order_number", nullable = false, unique = true)
    private String orderNumber;

    @ToString.Exclude
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ToString.Exclude
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shipping_address_id", nullable = false)
    private Address shippingAddress;

    @NotNull
    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @NotNull
    @Column(name = "shipping_cost", nullable = false, precision = 10, scale = 2)
    private BigDecimal shippingCost;
    
    @Column(name = "offer_discount_amount", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal offerDiscountAmount = BigDecimal.ZERO;

    @Column(name = "coupon_discount_amount", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal couponDiscountAmount = BigDecimal.ZERO;

    @NotNull
    @Column(name = "status", nullable = false, columnDefinition = "VARCHAR(255)")
    private OrderStatus status;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, columnDefinition = "VARCHAR(255)")
    private PaymentStatus paymentStatus;

    @Column(name = "payment_method")
    private String paymentMethod;

    @Column(name = "transaction_id")
    private String transactionId;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "applied_promotions_snapshot", columnDefinition = "JSON")
    private String appliedPromotionsSnapshot;

    // Gift service snapshot — stored at order time so historical accuracy is preserved even if prices change later
    @Column(name = "gift_service_id")
    private Long giftServiceId;

    @Column(name = "gift_service_name", length = 200)
    private String giftServiceName;

    @Column(name = "gift_service_price", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal giftServicePrice = BigDecimal.ZERO;

    @Column(name = "gift_message", columnDefinition = "TEXT")
    private String giftMessage;

    @Column(name = "courier_name")
    private String courierName;

    @Column(name = "tracking_number")
    private String trackingNumber;

    @Column(name = "expected_delivery_date")
    private java.time.LocalDate expectedDeliveryDate;

    @Column(name = "shipment_notes", columnDefinition = "TEXT")
    private String shipmentNotes;

    // ─── Refund fields ──────────────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(name = "refund_status", columnDefinition = "VARCHAR(50)")
    @Builder.Default
    private RefundStatus refundStatus = RefundStatus.NOT_REQUIRED;

    /** Razorpay refund ID returned after a successful refund call (e.g. rfnd_xxx). */
    @Column(name = "refund_id")
    private String refundId;

    /** Amount to be (or already) refunded — set at cancellation time. */
    @Column(name = "refund_amount", precision = 10, scale = 2)
    private BigDecimal refundAmount;

    /** Timestamp when admin triggered the refund. */
    @Column(name = "refund_initiated_at")
    private LocalDateTime refundInitiatedAt;

    /** Timestamp when Razorpay confirmed completion. */
    @Column(name = "refund_completed_at")
    private LocalDateTime refundCompletedAt;

    /** Razorpay error message if the refund failed. */
    @Column(name = "refund_failure_reason", columnDefinition = "TEXT")
    private String refundFailureReason;

    /** Email of the admin who initiated the refund — audit trail. */
    @Column(name = "refund_initiated_by")
    private String refundInitiatedBy;

    @ToString.Exclude
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();

    public void addItem(OrderItem item) {
        items.add(item);
        item.setOrder(this);
    }

    public void removeItem(OrderItem item) {
        items.remove(item);
        item.setOrder(null);
    }
}
