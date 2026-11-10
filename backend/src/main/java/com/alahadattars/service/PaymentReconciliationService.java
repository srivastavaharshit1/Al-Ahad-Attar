package com.alahadattars.service;

import com.alahadattars.dto.admin.reconciliation.AdminManualResolveRequest;
import com.alahadattars.dto.admin.reconciliation.PaymentReconciliationResponse;
import com.alahadattars.enums.ReconciliationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface PaymentReconciliationService {

    /**
     * Finds and processes orphaned captured payments that have aged past the grace period
     * or stale leases that require recovery. Invoked periodically by the scheduler.
     *
     * @return Number of candidate intents processed
     */
    int processEligibleOrphanPayments();

    /**
     * Processes a single payment intent for reconciliation with lease fencing and two-phase transactions.
     *
     * @param paymentIntentId ID of the PaymentIntent to process
     */
    void processSingleIntent(Long paymentIntentId);

    /**
     * Reconciles an asynchronous refund webhook (refund.processed or refund.failed)
     * for an orphaned payment intent that has no local Order.
     */
    void reconcileRefundFromWebhook(String razorpayRefundId, String paymentId, String razorpayStatus);

    /**
     * Returns a paginated list of payment reconciliations for administration.
     */
    Page<PaymentReconciliationResponse> getReconciliations(ReconciliationStatus status, Pageable pageable);

    /**
     * Manually triggers an administrative retry for a FAILED or PENDING_CONFIRMATION reconciliation.
     */
    PaymentReconciliationResponse retryReconciliation(Long paymentIntentId, String adminEmail);

    /**
     * Manually resolves an orphaned payment with evidence when settled offline.
     */
    PaymentReconciliationResponse manualResolve(Long paymentIntentId, AdminManualResolveRequest request, String adminEmail);
}

