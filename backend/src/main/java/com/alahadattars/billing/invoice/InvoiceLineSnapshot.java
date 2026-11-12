package com.alahadattars.billing.invoice;

import java.math.BigDecimal;

public record InvoiceLineSnapshot(
        int lineNumber,
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
        Long freePromotionId) {

    public InvoiceLineSnapshot(int lineNumber, Long productId, Long variantId, String productName,
                               String variantSize, int quantity, BigDecimal unitPrice, Long bottleId,
                               String bottleName, BigDecimal bottlePrice, BigDecimal promotionDiscount,
                               BigDecimal manualDiscount, BigDecimal lineTotal) {
        this(lineNumber, productId, variantId, productName, variantSize, quantity, unitPrice, bottleId,
                bottleName, bottlePrice, promotionDiscount, manualDiscount, lineTotal, false, null);
    }

    public InvoiceLineSnapshot {
        if (lineNumber <= 0 || quantity <= 0) {
            throw new IllegalArgumentException("line number and quantity must be positive");
        }
        if (productName == null || productName.isBlank()) {
            throw new IllegalArgumentException("product name snapshot is required");
        }
        requireMoney(unitPrice, "unitPrice");
        requireMoney(bottlePrice, "bottlePrice");
        requireMoney(promotionDiscount, "promotionDiscount");
        requireMoney(manualDiscount, "manualDiscount");
        requireMoney(lineTotal, "lineTotal");
        if ((bottleId == null) != (bottleName == null)) {
            throw new IllegalArgumentException("bottle identity and name snapshot must be provided together");
        }
        if (freeItem != (freePromotionId != null)) {
            throw new IllegalArgumentException("free item status and promotion identity must be provided together");
        }
        BigDecimal gross = unitPrice.add(bottlePrice).multiply(BigDecimal.valueOf(quantity));
        BigDecimal expected = gross.subtract(promotionDiscount).subtract(manualDiscount);
        if (expected.signum() < 0 || expected.compareTo(lineTotal) != 0) {
            throw new IllegalArgumentException("line discounts must reconcile to a nonnegative line total");
        }
    }

    private static void requireMoney(BigDecimal value, String field) {
        if (value == null || value.signum() < 0 || value.stripTrailingZeros().scale() > 2) {
            throw new IllegalArgumentException(field + " must be a nonnegative currency amount with at most two decimals");
        }
    }
}
