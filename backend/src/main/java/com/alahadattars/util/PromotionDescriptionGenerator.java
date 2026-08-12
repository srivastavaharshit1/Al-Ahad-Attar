package com.alahadattars.util;

import com.alahadattars.entity.PromotionConfiguration;
import com.alahadattars.enums.PromotionScope;
import com.alahadattars.enums.PromotionType;

import java.util.List;

/**
 * Builds a human-readable qualification/gift summary for a promotion (e.g. "Buy any 3x 12ml Attar
 * -> get a free 3ml Attar item") so customer-facing surfaces (Offers page, Product page, Cart free
 * gift panel) can show real specifics instead of a generic hardcoded "Free Gift Included" string.
 * Only FREE_PRODUCT is handled today — other promotion types return null and callers keep
 * showing the promotion's own `description` field, unchanged.
 */
public final class PromotionDescriptionGenerator {

    private PromotionDescriptionGenerator() {
    }

    public static String generate(PromotionType type, PromotionConfiguration config,
                                   String buyCategoryName, String buyProductName, String freeCategoryName,
                                   String freeProductName) {
        if (type != PromotionType.FREE_PRODUCT || config == null) return null;

        int minQty = config.getMinPurchaseQuantity() != null ? config.getMinPurchaseQuantity() : 1;
        int freeQty = config.getMaxFreeQuantity() != null ? config.getMaxFreeQuantity() : 1;

        String buySizeClause = sizeClause(config.getBuyVariantSizes(), config.getBuyVariantSize());
        String freeSizeClause = sizeClause(config.getFreeVariantSizes(), config.getAllowedFreeVariantSize());

        String buyTarget = describeTarget(config.getBuyScope(), buyCategoryName, buyProductName, "any product");
        String freeTarget = describeTarget(config.getFreeScope(), freeCategoryName, freeProductName,
                buyCategoryName != null ? buyCategoryName : "an eligible product");

        StringBuilder sb = new StringBuilder("Buy ");
        sb.append(minQty > 1 ? "any " + minQty + "x " : "");
        if (buySizeClause != null) sb.append(buySizeClause).append(" ");
        sb.append(buyTarget);
        sb.append(" → get ");
        sb.append(freeQty > 1 ? freeQty + "x " : "a ");
        if (freeSizeClause != null) sb.append(freeSizeClause).append(" ");
        sb.append(freeTarget).append(freeQty > 1 ? " free" : " free item");

        return sb.toString();
    }

    private static String sizeClause(List<String> sizes, String legacySingle) {
        if (sizes != null && !sizes.isEmpty()) return String.join("/", sizes);
        if (legacySingle != null && !legacySingle.isBlank()) return legacySingle.trim();
        return null;
    }

    private static String describeTarget(PromotionScope scope, String categoryName, String productName, String fallback) {
        if (scope == PromotionScope.SPECIFIC_PRODUCT && productName != null) return productName;
        if (scope == PromotionScope.CATEGORY && categoryName != null) return categoryName;
        if (scope == null) {
            // Legacy inference — best-effort guess at what the config actually targets.
            if (productName != null) return productName;
            if (categoryName != null) return categoryName;
        }
        return fallback;
    }
}
