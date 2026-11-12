package com.alahadattars.billing.delivery;

public enum InvoiceDeliveryStatus {
    PENDING,
    PROCESSING,
    PROVIDER_ACCEPTED,
    DELIVERED,
    FAILED,
    RETRY_WAIT,
    AMBIGUOUS,
    BLOCKED_CONFIGURATION,
    SKIPPED_NO_CONSENT
}
