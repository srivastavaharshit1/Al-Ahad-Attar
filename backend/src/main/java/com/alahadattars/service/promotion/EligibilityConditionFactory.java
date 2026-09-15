package com.alahadattars.service.promotion;

import com.alahadattars.entity.Promotion;
import com.alahadattars.enums.PromotionType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class EligibilityConditionFactory {

    private final LegacyCategoryDiscountCondition categoryCondition;
    private final LegacyProductDiscountCondition productCondition;

    @Autowired
    public EligibilityConditionFactory(LegacyCategoryDiscountCondition categoryCondition,
                                       LegacyProductDiscountCondition productCondition) {
        this.categoryCondition = categoryCondition;
        this.productCondition = productCondition;
    }

    public ItemEligibilityCondition getCondition(Promotion promotion) {
        if (promotion == null || promotion.getPromotionType() == null) {
            return null;
        }

        if (promotion.getPromotionType() == PromotionType.CATEGORY_DISCOUNT) {
            return categoryCondition;
        } else if (promotion.getPromotionType() == PromotionType.PRODUCT_DISCOUNT) {
            return productCondition;
        } else if (promotion.getPromotionType() == PromotionType.BUY_X_GET_Y) {
            if (promotion.getConfiguration() != null && 
                promotion.getConfiguration().getApplicableProductIds() != null && 
                !promotion.getConfiguration().getApplicableProductIds().isEmpty()) {
                return productCondition;
            }
            return categoryCondition;
        }
        
        return null;
    }
}
