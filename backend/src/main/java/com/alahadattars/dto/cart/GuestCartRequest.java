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
        @NotNull(message = "Product ID is required")
        private Long productId;
        
        @NotNull(message = "Variant ID is required")
        private Long variantId;

        @NotNull(message = "Quantity is required")
        private Integer quantity;
        
        @Builder.Default
        private boolean freeItem = false;
        
        private Long freePromotionId;

        private Long bottleId;
    }
}
