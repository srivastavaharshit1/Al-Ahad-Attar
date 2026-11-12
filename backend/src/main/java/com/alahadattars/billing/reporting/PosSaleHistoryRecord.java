package com.alahadattars.billing.reporting;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PosSaleHistoryRecord(long saleId, UUID saleKey, String invoiceNumber, String customerName,
                                   String customerMobile, String customerEmail, BigDecimal subtotal,
                                   BigDecimal promotionDiscount, BigDecimal manualDiscount,
                                   BigDecimal payable, String tenderMethod, BigDecimal amountReceived,
                                   BigDecimal changeReturned, Instant completedAt) { }
