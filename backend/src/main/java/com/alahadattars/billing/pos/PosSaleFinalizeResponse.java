package com.alahadattars.billing.pos;

import com.alahadattars.billing.sale.TenderMethod;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PosSaleFinalizeResponse(
        long saleId,
        UUID saleKey,
        String status,
        long invoiceId,
        String invoiceNumber,
        Instant issuedAt,
        String quoteFingerprint,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal subtotal,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal promotionDiscount,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal manualDiscount,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal payableAmount,
        TenderMethod tenderMethod,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal amountReceived,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal changeReturned,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal amountApplied,
        boolean replayed) {
}
