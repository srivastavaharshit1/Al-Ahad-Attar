package com.alahadattars.dto.order;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemRequest {

    private Long variantId;

    private Long giftSetId;

    @Builder.Default
    private boolean isGiftSet = false;

    @NotNull
    @Positive
    private Integer quantity;

    private Long bottleId;

    /**
     * True when this item is a free gift granted by a FREE_PRODUCT promotion.
     * The backend validates this claim during checkout — never trusts frontend blindly.
     */
    @Builder.Default
    private boolean freeItem = false;

    /**
     * ID of the FREE_PRODUCT Promotion that granted this free item.
     * Used to re-validate eligibility at checkout.
     */
    private Long freePromotionId;

    public boolean isGiftSet() {
        return isGiftSet;
    }

    public void setGiftSet(boolean isGiftSet) {
        this.isGiftSet = isGiftSet;
    }
}
