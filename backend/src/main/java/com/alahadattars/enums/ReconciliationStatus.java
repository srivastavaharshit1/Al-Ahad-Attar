package com.alahadattars.enums;

/**
 * Lifecycle states of an orphaned captured payment undergoing reconciliation and recovery.
 */
public enum ReconciliationStatus {
    /**
     * Default state. Intent was created for checkout, no reconciliation action has been taken.
     */
    NONE,

    /**
     * Under active reconciliation by a worker thread with an unexpired lease lock.
     */
    PROCESSING,

    /**
     * Refund has been submitted/queued at gateway or an HTTP timeout occurred.
     * Outcome is in-flight awaiting webhook or gateway verification check.
     */
    PENDING_CONFIRMATION,

    /**
     * Terminal success. Gateway has confirmed the refund reached the 'processed' status.
     */
    REFUNDED,

    /**
     * Terminal failure. Gateway definitively rejected the refund, an anomaly was detected,
     * or maximum auto-retries were exceeded. Requires administrative review.
     */
    FAILED,

    /**
     * Terminal exemption. A matching Order was confirmed to exist in the database;
     * no refund is needed.
     */
    EXEMPT_ORDER_FOUND,

    /**
     * Terminal administrative resolution. Settled manually by an administrator
     * with mandatory evidence notes.
     */
    MANUALLY_RESOLVED
}

