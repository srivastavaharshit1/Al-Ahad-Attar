package com.alahadattars.service;

import com.alahadattars.dto.cart.CartItemRequest;
import com.alahadattars.dto.cart.CartResponse;

public interface CartService {
    CartResponse getCart(String email);
    CartResponse addToCart(String email, CartItemRequest request);
    CartResponse updateQuantity(String email, Long cartItemId, Integer quantity);
    void removeFromCart(String email, Long cartItemId);
    CartResponse applyCoupon(String email, String couponCode);
    CartResponse removeCoupon(String email);
    CartResponse applyPromotion(String email, Long promotionId);
    CartResponse removePromotion(String email);
    void clearCart(String email);

    /**
     * Adds a free item to the cart after backend validates eligibility via the Promotion Engine.
     * The frontend only provides the variantId and promotionId — backend decides if it's allowed.
     *
     * @param email       Authenticated customer email
     * @param promotionId The FREE_PRODUCT promotion granting this item
     * @param variantId   The variant the customer chose
     * @return Updated CartResponse
     */
    CartResponse addFreeItemToCart(String email, Long promotionId, Long variantId);

    /**
     * Removes a free item from the cart. Only works for items where isFreeItem = true.
     *
     * @param email      Authenticated customer email
     * @param cartItemId The CartItem ID to remove
     * @return Updated CartResponse
     */
    CartResponse removeFreeItemFromCart(String email, Long cartItemId);
}
