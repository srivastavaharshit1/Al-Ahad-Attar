package com.alahadattars.dto.cart;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GuestCartRequest {
    private List<GuestCartItemRequest> items;
    private String couponCode;
    private Long manuallySelectedPromotionId;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GuestCartItemRequest {
        private Long productId;
        
        private Long variantId;

        private Long giftSetId;

        @Builder.Default
        private boolean isGiftSet = false;

        @NotNull(message = "Quantity is required")
        private Integer quantity;
        
        @Builder.Default
        private boolean freeItem = false;
        
        private Long freePromotionId;

        private Long bottleId;

        public boolean isGiftSet() {
            return isGiftSet;
        }

        public void setGiftSet(boolean isGiftSet) {
            this.isGiftSet = isGiftSet;
        }
    }
}
