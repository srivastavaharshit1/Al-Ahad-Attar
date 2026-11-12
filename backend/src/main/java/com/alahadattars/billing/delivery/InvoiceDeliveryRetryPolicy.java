package com.alahadattars.billing.delivery;

import java.time.Instant;

public final class InvoiceDeliveryRetryPolicy {
    public static final int MAX_ATTEMPTS = 8;
    private static final long INITIAL_DELAY_SECONDS = 30;
    private static final long MAX_DELAY_SECONDS = 6 * 60 * 60L;

    public InvoiceDeliveryStatus statusFor(DeliveryFailureKind failureKind, int attemptNumber) {
        return switch (failureKind) {
            case BLOCKED_CONFIGURATION -> InvoiceDeliveryStatus.BLOCKED_CONFIGURATION;
            case PERMANENT -> InvoiceDeliveryStatus.FAILED;
            case AMBIGUOUS -> InvoiceDeliveryStatus.AMBIGUOUS;
            case TRANSIENT -> attemptNumber >= MAX_ATTEMPTS
                    ? InvoiceDeliveryStatus.FAILED : InvoiceDeliveryStatus.RETRY_WAIT;
        };
    }

    public Instant nextAttemptAt(int attemptNumber, Instant now) {
        int exponent = Math.min(Math.max(attemptNumber - 1, 0), 10);
        long delay = Math.min(INITIAL_DELAY_SECONDS * (1L << exponent), MAX_DELAY_SECONDS);
        return now.plusSeconds(delay);
    }
}
