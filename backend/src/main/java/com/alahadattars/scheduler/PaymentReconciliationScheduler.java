package com.alahadattars.scheduler;

import com.alahadattars.service.PaymentReconciliationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Periodically polls and recovers orphaned captured payments that were never associated with an Order.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "app.payment.reconciliation.enabled", havingValue = "true", matchIfMissing = true)
public class PaymentReconciliationScheduler {

    private final PaymentReconciliationService reconciliationService;

    @Scheduled(fixedDelayString = "${app.payment.reconciliation.polling-interval-ms:300000}", initialDelay = 60000)
    public void runPaymentReconciliation() {
        log.debug("Starting scheduled payment reconciliation evaluation...");
        try {
            int count = reconciliationService.processEligibleOrphanPayments();
            if (count > 0) {
                log.info("Payment reconciliation run completed. Processed {} candidate intent(s).", count);
            }
        } catch (Exception e) {
            log.error("Error during scheduled payment reconciliation: {}", e.getMessage(), e);
        }
    }
}

