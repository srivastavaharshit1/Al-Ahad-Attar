package com.alahadattars.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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

/**
 * Server-side record of a payment we asked Razorpay to collect.
 *
 * A Razorpay signature only proves "some payment happened for some Razorpay order" — on its own it
 * says nothing about how much was captured, who it belongs to, or whether it has already been spent.
 * This row is what binds those three facts, so checkout can reconcile against it instead of trusting
 * the client-supplied triple.
 */
@Entity
@Table(
    name = "payment_intent",
    indexes = {
        @Index(name = "idx_payment_intent_rzp_order", columnList = "razorpay_order_id", unique = true),
        @Index(name = "idx_payment_intent_user_id", columnList = "user_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class PaymentIntent extends BaseEntity {

    @NotBlank
    @Column(name = "razorpay_order_id", nullable = false, unique = true)
    private String razorpayOrderId;

    @ToString.Exclude
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Amount we actually asked Razorpay to collect, in rupees. */
    @NotNull
    @Column(name = "amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    /** Set once the intent has backed an order. Enforced conditionally so a replay cannot spend it twice. */
    @Column(name = "consumed", nullable = false)
    @Builder.Default
    private boolean consumed = false;

    @Column(name = "consumed_at")
    private LocalDateTime consumedAt;

    @Column(name = "razorpay_payment_id")
    private String razorpayPaymentId;
}
