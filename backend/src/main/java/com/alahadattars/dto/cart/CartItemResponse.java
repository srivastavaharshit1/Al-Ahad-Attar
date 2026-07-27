package com.alahadattars.dto.cart;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartItemResponse {
    private Long id;
    private Long productId;
    private Long variantId;
    private String name;
    private String image;
    private String size;
    private Integer quantity;
    private BigDecimal originalPrice;
    private BigDecimal discountAmount;
    private BigDecimal finalPrice;
    private List<String> appliedPromotions;

    /**
     * True when this item was granted for free via a FREE_PRODUCT Promotion.
     * Frontend renders a "🎁 FREE" badge and disables quantity controls.
     */
    private boolean freeItem;

    /**
     * ID of the FREE_PRODUCT Promotion that granted this free item.
     * Null for regular items.
     */
    private Long freePromotionId;
}
