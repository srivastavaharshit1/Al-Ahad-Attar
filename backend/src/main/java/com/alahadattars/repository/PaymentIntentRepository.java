package com.alahadattars.repository;

import com.alahadattars.entity.PaymentIntent;
import com.alahadattars.enums.ReconciliationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentIntentRepository extends JpaRepository<PaymentIntent, Long> {

    Optional<PaymentIntent> findByRazorpayOrderId(String razorpayOrderId);

    Optional<PaymentIntent> findByRazorpayPaymentId(String razorpayPaymentId);

    Optional<PaymentIntent> findByReconciliationRefundId(String reconciliationRefundId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PaymentIntent p WHERE p.razorpayOrderId = :razorpayOrderId")
    Optional<PaymentIntent> findByRazorpayOrderIdForUpdate(@Param("razorpayOrderId") String razorpayOrderId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PaymentIntent p WHERE p.razorpayPaymentId = :razorpayPaymentId")
    Optional<PaymentIntent> findByRazorpayPaymentIdForUpdate(@Param("razorpayPaymentId") String razorpayPaymentId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PaymentIntent p WHERE p.id = :id")
    Optional<PaymentIntent> findByIdForUpdate(@Param("id") Long id);

    /**
     * Finds candidates eligible for orphan recovery and lease evaluation:
     * 1. Unconsumed intents in NONE status older than the grace period where payment.captured webhook exists.
     * 2. Intents in PROCESSING with expired lease (crashed workers).
     * 3. Intents in PENDING_CONFIRMATION awaiting verification check.
     * 4. Transient FAILED intents with attempts below threshold.
     */
    @Query("SELECT pi FROM PaymentIntent pi WHERE "
            + "pi.reconciliationStatus <> com.alahadattars.enums.ReconciliationStatus.REFUNDED "
            + "AND pi.reconciliationStatus <> com.alahadattars.enums.ReconciliationStatus.EXEMPT_ORDER_FOUND "
            + "AND pi.reconciliationStatus <> com.alahadattars.enums.ReconciliationStatus.MANUALLY_RESOLVED "
            + "AND ("
            + "  (pi.consumed = false AND pi.reconciliationStatus = com.alahadattars.enums.ReconciliationStatus.NONE AND pi.createdAt <= :gracePeriodCutoff) "
            + "  OR (pi.reconciliationStatus = com.alahadattars.enums.ReconciliationStatus.PROCESSING AND pi.reconciliationLeaseExpiresAt IS NOT NULL AND pi.reconciliationLeaseExpiresAt <= :now) "
            + "  OR (pi.reconciliationStatus = com.alahadattars.enums.ReconciliationStatus.PENDING_CONFIRMATION AND pi.reconciliationAttempts < :maxAttempts) "
            + "  OR (pi.reconciliationStatus = com.alahadattars.enums.ReconciliationStatus.FAILED AND pi.reconciliationAttempts < :maxAttempts AND pi.reconciliationLastAttemptAt <= :retryCutoff) "
            + ") "
            + "AND EXISTS (SELECT 1 FROM WebhookEvent we WHERE we.orderId = pi.razorpayOrderId AND we.eventType = 'payment.captured') "
            + "ORDER BY pi.createdAt ASC")
    List<PaymentIntent> findEligibleForReconciliation(
            @Param("gracePeriodCutoff") LocalDateTime gracePeriodCutoff,
            @Param("now") LocalDateTime now,
            @Param("retryCutoff") LocalDateTime retryCutoff,
            @Param("maxAttempts") int maxAttempts);

    Page<PaymentIntent> findByReconciliationStatusNot(ReconciliationStatus status, Pageable pageable);

    Page<PaymentIntent> findByReconciliationStatus(ReconciliationStatus status, Pageable pageable);

    /**
     * Conditionally marks the intent spent. Returns 0 when it was already consumed, which is what makes
     * replaying the same Razorpay triple fail even under concurrent requests.
     */
    @Modifying(flushAutomatically = true)
    @Query("UPDATE PaymentIntent pi SET pi.consumed = true, pi.consumedAt = :now, pi.razorpayPaymentId = :paymentId "
            + "WHERE pi.id = :id AND pi.consumed = false")
    int markConsumed(@Param("id") Long id,
                     @Param("paymentId") String paymentId,
                     @Param("now") LocalDateTime now);

    /**
     * Conditionally marks the intent as alerted for a stuck checkout. Returns 0 when it was already alerted.
     */
    @Modifying(flushAutomatically = true)
    @Query("UPDATE PaymentIntent pi SET pi.stuckAlerted = true WHERE pi.id = :id AND pi.stuckAlerted = false")
    int markStuckAlerted(@Param("id") Long id);
}
