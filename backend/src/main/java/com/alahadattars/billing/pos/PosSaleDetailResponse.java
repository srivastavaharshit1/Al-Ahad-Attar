package com.alahadattars.billing.pos;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PosSaleDetailResponse(
        long saleId,
        UUID saleKey,
        String idempotencyKey,
        String saleStatus,
        String createdByEmail,
        Instant createdAt,
        Instant completedAt,
        String customerName,
        String customerMobile,
        String customerEmail,
        BigDecimal subtotalAmount,
        BigDecimal promotionDiscountAmount,
        BigDecimal manualDiscountAmount,
        BigDecimal payableAmount,
        String confirmedQuoteFingerprint,
        TenderDetail tender,
        InvoiceDetail invoice,
        List<LineDetail> lines,
        List<PromotionDetail> promotions,
        List<DiscountDetail> discounts,
        List<TimelineDetail> timeline
) {
    public record TenderDetail(
            String tenderMethod,
            BigDecimal payableAmount,
            BigDecimal amountReceived,
            BigDecimal changeReturned,
            BigDecimal amountApplied,
            String transactionReference,
            Instant recordedAt
    ) { }

    public record InvoiceDetail(
            Long invoiceId,
            String invoiceNumber,
            String invoiceStatus,
            Instant issuedAt
    ) { }

    public record LineDetail(
            long lineId,
            String lineKey,
            Long productId,
            Long variantId,
            String productName,
            String variantSize,
            int quantity,
            BigDecimal unitPrice,
            Long bottleId,
            String bottleName,
            BigDecimal bottlePrice,
            BigDecimal promotionDiscount,
            BigDecimal manualDiscount,
            BigDecimal lineTotal,
            boolean freeItem,
            Long freePromotionId
    ) { }

    public record PromotionDetail(
            long promotionId,
            String name,
            String code,
            String type
    ) { }

    public record DiscountDetail(
            String scope,
            String discountType,
            BigDecimal requestedValue,
            BigDecimal appliedAmount,
            String reason
    ) { }

    public record TimelineDetail(
            String stage,
            String title,
            Instant timestamp,
            String status,
            String description,
            boolean derived
    ) { }
}

