package com.alahadattars.entity;

import com.alahadattars.enums.RefundStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
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
 * A single refund attempt against an order's payment. This is the durable audit trail — every
 * attempt gets its own row (including failed ones, so a retry history is preserved), unlike the
 * summary fields still kept on {@link Order} (refundStatus/refundAmount/refundId/...) which
 * reflect only the *current* state and exist for backward compatibility with API consumers/UI
 * that already read them directly off the order. Both are kept in sync by OrderServiceImpl —
 * this table is the source of truth for "what actually happened," Order's fields are a
 * denormalized "what's true right now" view.
 */
@Entity
@Table(
    name = "refund",
    indexes = {
        @Index(name = "idx_refund_order_id", columnList = "order_id"),
        @Index(name = "idx_refund_status", columnList = "status"),
        // Hard DB-level backstop: two Refund rows can never claim the same Razorpay refund id.
        // Multiple rows per order are still allowed (and expected — one per attempt, including
        // failed ones), and NULL (no attempt reached Razorpay yet) is unconstrained since
        // Postgres/MySQL both treat NULLs as distinct under a unique index.
        @Index(name = "idx_refund_razorpay_refund_id", columnList = "razorpay_refund_id", unique = true)
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class Refund extends BaseEntity {

    @ToString.Exclude
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    /** Razorpay payment ID the refund was issued against (Order.transactionId at the time). */
    @NotNull
    @Column(name = "payment_id", nullable = false)
    private String paymentId;

    /** Razorpay refund ID (e.g. "rfnd_xxx") — set once Razorpay accepts the refund request. */
    @Column(name = "razorpay_refund_id")
    private String razorpayRefundId;

    @NotNull
    @Column(name = "amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "VARCHAR(50)")
    private RefundStatus status;

    /** Razorpay error message, or another failure explanation, when status is FAILED. */
    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    @Column(name = "initiated_at")
    private LocalDateTime initiatedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
