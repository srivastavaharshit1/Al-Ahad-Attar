package com.alahadattars.billing.delivery;

import java.time.Instant;

public record InvoiceConsentView(InvoiceDeliveryChannel channel, String destination, InvoiceConsentStatus status,
                                 String wordingVersion, Instant capturedAt, Instant revokedAt) {
}
