package com.alahadattars.billing.delivery;

import com.alahadattars.billing.invoice.InvoiceListItem;

import java.time.Instant;
import java.util.UUID;

public record InvoiceDeliveryJob(
        long id,
        UUID deliveryKey,
        long invoiceId,
        InvoiceDeliveryChannel channel,
        String destination,
        int attemptNumber,
        Instant startedAt,
        InvoiceListItem invoice) {
}
