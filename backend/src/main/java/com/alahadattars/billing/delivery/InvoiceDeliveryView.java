package com.alahadattars.billing.delivery;

import java.time.Instant;
import java.util.UUID;

public record InvoiceDeliveryView(
        long id,
        UUID deliveryKey,
        InvoiceDeliveryChannel channel,
        InvoiceDeliveryStatus status,
        int attemptCount,
        String destination,
        String providerMessageId,
        String lastErrorCode,
        String lastErrorSummary,
        Instant createdAt,
        Instant updatedAt) {
}
