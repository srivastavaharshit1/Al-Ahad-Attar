package com.alahadattars.repository;

import com.alahadattars.entity.PaymentIntent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PaymentIntentRepository extends JpaRepository<PaymentIntent, Long> {

    Optional<PaymentIntent> findByRazorpayOrderId(String razorpayOrderId);

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
