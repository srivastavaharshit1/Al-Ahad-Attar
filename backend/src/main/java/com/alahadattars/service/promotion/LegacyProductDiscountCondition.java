package com.alahadattars.service.promotion;

import com.alahadattars.entity.CartItem;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.Promotion;
import com.alahadattars.entity.PromotionConfiguration;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class LegacyProductDiscountCondition implements ItemEligibilityCondition {

    @Override
    public boolean isProductEligible(Promotion promo, Product product) {
        if (product == null) return false;
        PromotionConfiguration config = promo.getConfiguration();
        if (config == null || config.getApplicableProductIds() == null
                || config.getApplicableProductIds().isEmpty()) return true;
        return config.getApplicableProductIds().contains(product.getId());
    }

    @Override
    public boolean isItemEligible(Promotion promo, CartItem cartItem) {
        if (cartItem == null) {
            log.info("[LegacyProductDiscountCondition] Failed: cartItem is null");
            return false;
        }
        if (!isProductEligible(promo, cartItem.getProduct())) {
            log.info("[LegacyProductDiscountCondition] Failed: isProductEligible is false for Product ID={}", cartItem.getProduct().getId());
            return false;
        }
        Long catId = cartItem.getProduct().getCategory() != null ? cartItem.getProduct().getCategory().getId() : null;
        if (isExcluded(promo, catId, cartItem.getProduct().getId(), cartItem.getVariant().getId())) {
            log.info("[LegacyProductDiscountCondition] Failed: item is excluded");
            return false;
        }
        log.info("[LegacyProductDiscountCondition] Success for Product ID={}", cartItem.getProduct().getId());
        return true;
    }
}
