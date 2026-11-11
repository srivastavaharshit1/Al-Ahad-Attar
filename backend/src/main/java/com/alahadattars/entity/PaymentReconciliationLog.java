package com.alahadattars.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Append-only immutable audit log for payment reconciliation actions and state transitions.
 */
@Entity
@Table(
    name = "payment_reconciliation_log",
    indexes = {
        @Index(name = "idx_payment_recon_log_intent_id", columnList = "payment_intent_id"),
        @Index(name = "idx_payment_recon_log_created_at", columnList = "created_at"),
        @Index(name = "idx_payment_recon_log_payment_id", columnList = "payment_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class PaymentReconciliationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ToString.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_intent_id", nullable = false)
    private PaymentIntent paymentIntent;

    @Column(name = "action", nullable = false, length = 50)
    private String action;

    @Column(name = "status_before", length = 50)
    private String statusBefore;

    @Column(name = "status_after", length = 50)
    private String statusAfter;

    @Column(name = "payment_id", length = 100)
    private String paymentId;

    @Column(name = "refund_id", length = 100)
    private String refundId;

    @Column(name = "amount", precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "actor", nullable = false, length = 100)
    private String actor;

    @Column(name = "details", columnDefinition = "TEXT")
    private String details;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}

