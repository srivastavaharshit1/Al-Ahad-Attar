package com.alahadattars.billing.invoice;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record InvoiceListItem(
        long id,
        UUID invoiceKey,
        String invoiceNumber,
        InvoiceChannel channel,
        String customerName,
        BigDecimal total,
        Instant issuedAt) {
}
