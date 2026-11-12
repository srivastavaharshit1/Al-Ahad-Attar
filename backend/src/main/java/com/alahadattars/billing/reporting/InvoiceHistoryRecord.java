package com.alahadattars.billing.reporting;

import com.alahadattars.billing.invoice.InvoiceChannel;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record InvoiceHistoryRecord(long id, UUID invoiceKey, String invoiceNumber, InvoiceChannel channel,
                                   String customerName, String customerMobile, String customerEmail,
                                   Long saleId, UUID saleKey, String orderNumber,
                                   BigDecimal total, BigDecimal promotionDiscount, BigDecimal manualDiscount,
                                   String tenderMethod, String emailStatus, int emailAttempts,
                                   String whatsappStatus, int whatsappAttempts, Instant issuedAt) { }
