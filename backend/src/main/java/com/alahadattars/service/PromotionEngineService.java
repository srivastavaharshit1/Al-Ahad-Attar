package com.alahadattars.service;

import com.alahadattars.dto.cart.CartResponse;
import com.alahadattars.dto.cart.FreeProductOptionResponse;
import com.alahadattars.entity.Cart;
import com.alahadattars.entity.Product;

import java.math.BigDecimal;
import java.util.List;

public interface PromotionEngineService {

    /**
     * Evaluates all active promotions against a given cart and optionally applies a specific coupon code.
     * Modifies the CartResponse to reflect all valid item and cart level discounts.
     * Also populates CartResponse.freeProductOptions from FREE_PRODUCT promotions.
     *
     * @param cart       The cart to evaluate
     * @param couponCode Optional coupon code applied by the user
     * @return Fully evaluated CartResponse with pricing, messages, and free product options
     */
    CartResponse evaluateCart(Cart cart, String couponCode);

    /**
     * Calculates the best automatic promotion available for a specific product.
     * Useful for displaying discounted prices on Product Listing or Product Detail pages.
     */
    BigDecimal calculateBestProductPrice(Product product, BigDecimal originalPrice);

    /**
     * Returns eligible free product options for the cart based on all active FREE_PRODUCT promotions.
     * Called standalone from CartController for the /api/cart/free-product-options endpoint.
     *
     * @param cart       The cart to evaluate
     * @param couponCode Optional coupon code (a coupon might unlock a FREE_PRODUCT promo)
     * @return List of eligible free options (empty if none qualify)
     */
    List<FreeProductOptionResponse> evaluateFreeProductOptions(Cart cart, String couponCode);

    /**
     * Validates that a specific variantId is eligible as a free item under the given promotionId.
     * Returns the matching promotion if valid, throws IllegalArgumentException otherwise.
     * Used by CartServiceImpl when adding a free item.
     */
    void validateFreeItemEligibility(Cart cart, Long promotionId, Long variantId);
}
