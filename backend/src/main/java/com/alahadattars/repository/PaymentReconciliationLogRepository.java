package com.alahadattars.repository;

import com.alahadattars.entity.PaymentReconciliationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentReconciliationLogRepository extends JpaRepository<PaymentReconciliationLog, Long> {

    List<PaymentReconciliationLog> findByPaymentIntentIdOrderByCreatedAtDesc(Long paymentIntentId);

    List<PaymentReconciliationLog> findByPaymentIdOrderByCreatedAtDesc(String paymentId);
}

