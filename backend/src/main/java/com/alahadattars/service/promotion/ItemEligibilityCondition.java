package com.alahadattars.service.promotion;

import com.alahadattars.entity.CartItem;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.Promotion;

public interface ItemEligibilityCondition {
    boolean isItemEligible(Promotion promo, CartItem cartItem);
    boolean isProductEligible(Promotion promo, Product product);

    default boolean isExcluded(Promotion promo, Long categoryId, Long productId, Long variantId) {
        if (promo == null || promo.getConfiguration() == null) return false;
        com.alahadattars.entity.PromotionConfiguration config = promo.getConfiguration();
        if (categoryId != null && config.getExcludedCategoryIds() != null && config.getExcludedCategoryIds().contains(categoryId)) return true;
        if (productId != null && config.getExcludedProductIds() != null && config.getExcludedProductIds().contains(productId)) return true;
        if (variantId != null && config.getExcludedVariantIds() != null && config.getExcludedVariantIds().contains(variantId)) return true;
        return false;
    }
}
