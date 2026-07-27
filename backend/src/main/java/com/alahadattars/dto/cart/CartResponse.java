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
public class CartResponse {
    private Long id;
    private List<CartItemResponse> items;
    private BigDecimal subtotal;       // Before any discounts
    private BigDecimal itemDiscounts;  // Sum of product/category specific discounts
    private BigDecimal cartDiscount;   // Cart level discounts (e.g. flat off, coupon)
    private BigDecimal total;          // Final payable amount
    private String couponCode;         // Currently applied coupon code (if any)
    private List<com.alahadattars.dto.promotion.PromotionResponse> appliedPromotions;
    private List<com.alahadattars.dto.promotion.PromotionResponse> availablePromotions;
    private List<com.alahadattars.dto.promotion.PromotionResponse> lockedPromotions;
    private List<String> unlockMessages;       // "Spend ₹X more to unlock Offer"
    private Long manuallySelectedPromotionId;

    /**
     * Eligible free product options from the FREE_PRODUCT promotion engine.
     * Populated on every cart evaluation. Frontend renders as-is — no client logic.
     */
    private List<FreeProductOptionResponse> freeProductOptions;
}
