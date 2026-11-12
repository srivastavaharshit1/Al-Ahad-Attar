package com.alahadattars.billing.pos;

import com.alahadattars.billing.discount.DiscountScope;
import com.alahadattars.billing.discount.DiscountType;
import com.alahadattars.enums.PromotionType;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Immutable response snapshot for a read-only POS quote. */
public record PosQuoteResponse(
        Instant generatedAt,
        boolean previewOnly,
        long adminId,
        String adminEmail,
        List<Line> lines,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal subtotal,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal promotionItemDiscount,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal promotionCartDiscount,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal totalPromotionDiscount,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal manualDiscount,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal payableAmount,
        boolean allLinesAvailable,
        String couponCode,
        boolean couponApplied,
        List<PromotionSummary> appliedPromotions,
        List<PromotionSummary> availablePromotions,
        List<PromotionSummary> lockedPromotions,
        List<FreeRewardOption> freeRewardOptions,
        List<ManualDiscountPreview> manualDiscounts,
        List<String> messages,
        String quoteFingerprint) {

    public PosQuoteResponse {
        lines = List.copyOf(lines);
        appliedPromotions = List.copyOf(appliedPromotions);
        availablePromotions = List.copyOf(availablePromotions);
        lockedPromotions = List.copyOf(lockedPromotions);
        freeRewardOptions = List.copyOf(freeRewardOptions);
        manualDiscounts = List.copyOf(manualDiscounts);
        messages = List.copyOf(messages);
    }

    public record Line(
            String lineKey,
            Long productId,
            Long variantId,
            String productName,
            String variantSize,
            Integer quantity,
            @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal variantUnitPrice,
            Long bottleId,
            String bottleName,
            @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal bottleUnitPrice,
            @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal unitPrice,
            @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal lineSubtotal,
            @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal promotionDiscount,
            @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal lineAfterPromotions,
            @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal manualDiscount,
            @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal finalLineTotal,
            boolean freeItem,
            Long freePromotionId,
            Integer requestedVariantQuantity,
            Integer variantStockAvailable,
            boolean variantStockSufficient,
            Integer requestedBottleQuantity,
            Integer bottleStockAvailable,
            boolean bottleStockSufficient,
            boolean available) {
    }

    public record PromotionSummary(Long id, String name, String code, PromotionType type) {
    }

    public record FreeRewardOption(
            Long promotionId,
            Long productId,
            Long variantId,
            String productName,
            String variant,
            String promotion) {
    }

    public record ManualDiscountPreview(
            DiscountScope scope,
            DiscountType type,
            @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal requestedValue,
            @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal appliedAmount,
            @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal eligibleBalance,
            String lineKey,
            String reason) {
    }
}
