package com.alahadattars.service.promotion;

import com.alahadattars.entity.CartItem;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.Promotion;
import com.alahadattars.entity.PromotionConfiguration;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class LegacyCategoryDiscountCondition implements ItemEligibilityCondition {

    @Override
    public boolean isProductEligible(Promotion promo, Product product) {
        if (product == null) return false;
        PromotionConfiguration config = promo.getConfiguration();
        if (config == null || config.getApplicableCategoryIds() == null
                || config.getApplicableCategoryIds().isEmpty()) return true;
        if (product.getCategory() == null) return false;
        return config.getApplicableCategoryIds().contains(product.getCategory().getId());
    }

    @Override
    public boolean isItemEligible(Promotion promo, CartItem cartItem) {
        if (cartItem == null) {
            log.info("[LegacyCategoryDiscountCondition] Failed: cartItem is null");
            return false;
        }
        if (!isProductEligible(promo, cartItem.getProduct())) {
            log.info("[LegacyCategoryDiscountCondition] Failed: isProductEligible is false for Product ID={}", cartItem.getProduct().getId());
            return false;
        }
        Long catId = cartItem.getProduct().getCategory() != null ? cartItem.getProduct().getCategory().getId() : null;
        if (isExcluded(promo, catId, cartItem.getProduct().getId(), cartItem.getVariant().getId())) {
            log.info("[LegacyCategoryDiscountCondition] Failed: item is excluded");
            return false;
        }

        log.info("[LegacyCategoryDiscountCondition] Success for Product ID={}", cartItem.getProduct().getId());
        return true;
    }
}
