package com.alahadattars.billing.online;

public enum OnlineInvoiceJobStatus {
    PENDING,
    PROCESSING,
    RETRY_WAIT,
    BLOCKED_CONFIGURATION,
    COMPLETED,
    FAILED,
    SKIPPED_INELIGIBLE
}
