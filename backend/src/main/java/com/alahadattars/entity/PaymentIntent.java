package com.alahadattars.entity;

import com.alahadattars.enums.ReconciliationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
 *
 * Also tracks the full lifecycle of orphaned payment reconciliation, lease tokens, and recovery.
 */
@Entity
@Table(
    name = "payment_intent",
    indexes = {
        @Index(name = "idx_payment_intent_rzp_order", columnList = "razorpay_order_id", unique = true),
        @Index(name = "idx_payment_intent_user_id", columnList = "user_id"),
        @Index(name = "idx_payment_intent_recon_status", columnList = "reconciliation_status, created_at"),
        @Index(name = "idx_payment_intent_recon_lease", columnList = "reconciliation_status, reconciliation_lease_expires_at"),
        @Index(name = "idx_payment_intent_recon_payment_id", columnList = "razorpay_payment_id")
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
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = true)
    private User user;

    /** Amount we actually asked Razorpay to collect, in rupees. */
    @NotNull
    @Column(name = "amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    /** Set once the intent has backed an order or claimed by reconciliation. Enforced conditionally so a replay cannot spend it twice. */
    @Column(name = "consumed", nullable = false)
    @Builder.Default
    private boolean consumed = false;

    /** Set when a stuck checkout alert has been successfully sent for this intent to prevent duplicate emails. */
    @Column(name = "stuck_alerted", nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private boolean stuckAlerted = false;

    @Column(name = "consumed_at")
    private LocalDateTime consumedAt;

    @Column(name = "razorpay_payment_id")
    private String razorpayPaymentId;

    // --- Payment Reconciliation Fields ---

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "reconciliation_status", nullable = false, length = 50)
    @Builder.Default
    private ReconciliationStatus reconciliationStatus = ReconciliationStatus.NONE;

    @Column(name = "reconciliation_refund_id", length = 100)
    private String reconciliationRefundId;

    @Column(name = "reconciliation_failure_reason", columnDefinition = "TEXT")
    private String reconciliationFailureReason;

    @Column(name = "reconciliation_attempts", nullable = false)
    @Builder.Default
    private int reconciliationAttempts = 0;

    @Column(name = "reconciliation_lease_token", length = 64)
    private String reconciliationLeaseToken;

    @Column(name = "reconciliation_lease_expires_at")
    private LocalDateTime reconciliationLeaseExpiresAt;

    @Column(name = "reconciliation_last_attempt_at")
    private LocalDateTime reconciliationLastAttemptAt;

    @Column(name = "reconciliation_resolved_at")
    private LocalDateTime reconciliationResolvedAt;
}
