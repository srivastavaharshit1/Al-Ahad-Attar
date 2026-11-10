package com.alahadattars.service.impl;

import com.alahadattars.entity.PaymentIntent;
import com.alahadattars.entity.PaymentReconciliationLog;
import com.alahadattars.enums.ReconciliationStatus;
import com.alahadattars.repository.PaymentIntentRepository;
import com.alahadattars.repository.PaymentReconciliationLogRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
class PaymentReconciliationAuditRetentionIntegrationTest {

    @Autowired
    private PaymentIntentRepository paymentIntentRepository;

    @Autowired
    private PaymentReconciliationLogRepository reconciliationLogRepository;

    @Test
    @DisplayName("PaymentIntent with audit history CANNOT be deleted (Database RESTRICT foreign key constraint)")
    void testPaymentIntentWithAuditLogCannotBeDeleted() {
        // 1. Create a PaymentIntent
        PaymentIntent intent = paymentIntentRepository.save(PaymentIntent.builder()
                .razorpayOrderId("order_retention_test_" + System.currentTimeMillis())
                .razorpayPaymentId("pay_retention_test")
                .amount(new BigDecimal("1499.00"))
                .consumed(true)
                .reconciliationStatus(ReconciliationStatus.REFUNDED)
                .reconciliationRefundId("rfnd_audit_test")
                .build());

        assertNotNull(intent.getId());

        // 2. Attach an append-only audit log entry
        reconciliationLogRepository.save(PaymentReconciliationLog.builder()
                .paymentIntent(intent)
                .action("REFUND_SUCCESS")
                .statusBefore("PROCESSING")
                .statusAfter("REFUNDED")
                .paymentId("pay_retention_test")
                .refundId("rfnd_audit_test")
                .amount(new BigDecimal("1499.00"))
                .actor("SYSTEM_SCHEDULER")
                .details("Permanent financial audit entry")
                .createdAt(LocalDateTime.now())
                .build());

        // 3. Attempt to delete the PaymentIntent -> MUST fail with DataIntegrityViolationException!
        assertThrows(DataIntegrityViolationException.class, () -> {
            paymentIntentRepository.deleteById(intent.getId());
            paymentIntentRepository.flush();
        }, "Deleting PaymentIntent with audit history must fail with DataIntegrityViolationException");
    }

    @Test
    @DisplayName("Normal PaymentIntent without audit log can be managed through normal lifecycle")
    void testPaymentIntentWithoutAuditLogCanBeManaged() {
        PaymentIntent intent = paymentIntentRepository.save(PaymentIntent.builder()
                .razorpayOrderId("order_clean_test_" + System.currentTimeMillis())
                .razorpayPaymentId("pay_clean_test")
                .amount(new BigDecimal("500.00"))
                .consumed(false)
                .reconciliationStatus(ReconciliationStatus.NONE)
                .build());

        Long id = intent.getId();
        assertNotNull(id);

        // Lifecycle update
        intent.setConsumed(true);
        paymentIntentRepository.save(intent);

        // Delete without audit log succeeds
        paymentIntentRepository.deleteById(id);
        paymentIntentRepository.flush();

        assertTrue(paymentIntentRepository.findById(id).isEmpty());
    }
}

