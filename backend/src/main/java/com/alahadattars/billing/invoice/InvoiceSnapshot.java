package com.alahadattars.billing.invoice;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/** Immutable point-in-time invoice data; renderers never look up current catalog prices. */
public record InvoiceSnapshot(
        UUID invoiceKey,
        String invoiceNumber,
        InvoiceChannel channel,
        InvoiceSourceType sourceType,
        long sourceId,
        Instant issuedAt,
        InvoiceSellerSnapshot seller,
        InvoiceCustomerSnapshot customer,
        List<InvoiceLineSnapshot> lines,
        BigDecimal subtotal,
        BigDecimal promotionDiscount,
        BigDecimal manualDiscount,
        BigDecimal total,
        InvoiceTaxSnapshot tax,
        String invoiceNoticeSnapshot) {

    public InvoiceSnapshot {
        Objects.requireNonNull(invoiceKey, "invoiceKey is required");
        if (invoiceNumber == null || invoiceNumber.isBlank()) {
            throw new IllegalArgumentException("invoice number is required");
        }
        Objects.requireNonNull(channel, "channel is required");
        Objects.requireNonNull(sourceType, "source type is required");
        if ((channel == InvoiceChannel.ONLINE && sourceType != InvoiceSourceType.ONLINE_ORDER)
                || (channel == InvoiceChannel.POS && sourceType != InvoiceSourceType.POS_SALE)) {
            throw new IllegalArgumentException("invoice channel and source type do not match");
        }
        if (sourceId <= 0) {
            throw new IllegalArgumentException("source id must be positive");
        }
        Objects.requireNonNull(issuedAt, "issuedAt is required");
        Objects.requireNonNull(seller, "seller snapshot is required");
        lines = List.copyOf(lines);
        if (lines.isEmpty()) {
            throw new IllegalArgumentException("invoice must contain at least one line");
        }
        Objects.requireNonNull(tax, "tax snapshot is required");
        if (tax.status() == GstStatus.UNREGISTERED
                && (invoiceNoticeSnapshot == null || invoiceNoticeSnapshot.isBlank())) {
            throw new IllegalArgumentException("approved unregistered-invoice wording must be snapshotted");
        }
        if (invoiceNoticeSnapshot != null && invoiceNoticeSnapshot.length() > 1000) {
            throw new IllegalArgumentException("invoice notice exceeds 1000 characters");
        }
        requireMoney(subtotal, "subtotal");
        requireMoney(promotionDiscount, "promotionDiscount");
        requireMoney(manualDiscount, "manualDiscount");
        requireMoney(total, "total");

        BigDecimal lineGross = lines.stream()
                .map(line -> line.unitPrice().add(line.bottlePrice()).multiply(BigDecimal.valueOf(line.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal linePromotions = lines.stream().map(InvoiceLineSnapshot::promotionDiscount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal lineManual = lines.stream().map(InvoiceLineSnapshot::manualDiscount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal lineTotals = lines.stream().map(InvoiceLineSnapshot::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (subtotal.compareTo(lineGross) != 0
                || promotionDiscount.compareTo(linePromotions) != 0
                || manualDiscount.compareTo(lineManual) != 0
                || total.compareTo(lineTotals) != 0
                || subtotal.subtract(promotionDiscount).subtract(manualDiscount).compareTo(total) != 0) {
            throw new IllegalArgumentException("invoice header totals do not reconcile with immutable line snapshots");
        }
    }

    private static void requireMoney(BigDecimal value, String field) {
        if (value == null || value.signum() < 0 || value.stripTrailingZeros().scale() > 2) {
            throw new IllegalArgumentException(field + " must be a nonnegative currency amount with at most two decimals");
        }
    }
}
