package com.alahadattars.billing.delivery;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;

class InvoiceDeliveryRetryPolicyTest {
    private final InvoiceDeliveryRetryPolicy policy = new InvoiceDeliveryRetryPolicy();

    @Test
    void retriesOnlyKnownTransientFailuresWithCappedBackoff() {
        Instant now = Instant.parse("2026-11-11T10:00:00Z");

        assertEquals(InvoiceDeliveryStatus.RETRY_WAIT, policy.statusFor(DeliveryFailureKind.TRANSIENT, 1));
        assertEquals(now.plusSeconds(30), policy.nextAttemptAt(1, now));
        assertEquals(now.plusSeconds(60), policy.nextAttemptAt(2, now));
        assertEquals(InvoiceDeliveryStatus.FAILED,
                policy.statusFor(DeliveryFailureKind.TRANSIENT, InvoiceDeliveryRetryPolicy.MAX_ATTEMPTS));
    }

    @Test
    void neverAutomaticallyRetriesAmbiguousOutcomes() {
        assertEquals(InvoiceDeliveryStatus.AMBIGUOUS,
                policy.statusFor(DeliveryFailureKind.AMBIGUOUS, 1));
        assertEquals(InvoiceDeliveryStatus.FAILED,
                policy.statusFor(DeliveryFailureKind.PERMANENT, 1));
        assertEquals(InvoiceDeliveryStatus.BLOCKED_CONFIGURATION,
                policy.statusFor(DeliveryFailureKind.BLOCKED_CONFIGURATION, 1));
    }
}
