package com.alahadattars.service.impl;

import com.alahadattars.dto.cart.CartItemRequest;
import com.alahadattars.dto.cart.CartResponse;
import com.alahadattars.entity.Cart;
import com.alahadattars.entity.CartItem;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.User;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.repository.CartRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.UserRepository;
import com.alahadattars.service.CartService;
import com.alahadattars.service.PromotionEngineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Slf4j
@Service
@RequiredArgsConstructor
public class CartServiceImpl implements CartService {

    private final CartRepository cartRepository;
    private final UserRepository userRepository;
    private final ProductVariantRepository productVariantRepository;
    private final PromotionEngineService promotionEngineService;

    // ─── Standard Cart Operations ─────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public CartResponse getCart(String email) {
        Cart cart = getOrCreateCart(email);
        return promotionEngineService.evaluateCart(cart, cart.getCouponCode());
    }

    @Override
    @Transactional
    public CartResponse addToCart(String email, CartItemRequest request) {
        Cart cart = getOrCreateCart(email);
        ProductVariant variant = productVariantRepository.findById(request.getVariantId())
                .orElseThrow(() -> new ResourceNotFoundException("Product Variant not found"));

        if (!variant.isActive()) throw new IllegalArgumentException("Product variant is not available");
        if (variant.getStock() < request.getQuantity())
            throw new IllegalArgumentException("Insufficient stock. Available: " + variant.getStock());

        // Don't merge with free items of same variant — they must stay separate
        CartItem existing = cart.getItems().stream()
                .filter(item -> !item.isFreeItem())
                .filter(item -> item.getVariant().getId().equals(variant.getId()))
                .findFirst()
                .orElse(null);

        if (existing != null) {
            existing.setQuantity(existing.getQuantity() + request.getQuantity());
        } else {
            CartItem newItem = CartItem.builder()
                    .cart(cart)
                    .product(variant.getProduct())
                    .variant(variant)
                    .quantity(request.getQuantity())
                    .price(variant.getPrice())
                    .freeItem(false)
                    .build();
            cart.addItem(newItem);
        }

        Cart saved = cartRepository.save(cart);
        return promotionEngineService.evaluateCart(saved, saved.getCouponCode());
    }

    @Override
    @Transactional
    public CartResponse updateQuantity(String email, Long cartItemId, Integer quantity) {
        Cart cart = getOrCreateCart(email);
        CartItem item = cart.getItems().stream()
                .filter(i -> i.getId().equals(cartItemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found"));

        if (item.isFreeItem())
            throw new IllegalArgumentException("Quantity of free gifts cannot be changed. Remove and re-add instead.");

        if (quantity <= 0) {
            cart.removeItem(item);
        } else {
            if (item.getVariant().getStock() < quantity)
                throw new IllegalArgumentException("Insufficient stock. Available: " + item.getVariant().getStock());
            item.setQuantity(quantity);
        }

        Cart saved = cartRepository.save(cart);
        return promotionEngineService.evaluateCart(saved, saved.getCouponCode());
    }

    @Override
    @Transactional
    public void removeFromCart(String email, Long cartItemId) {
        Cart cart = getOrCreateCart(email);
        CartItem item = cart.getItems().stream()
                .filter(i -> i.getId().equals(cartItemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found"));
        cart.removeItem(item);
        cartRepository.save(cart);
    }

    @Override
    @Transactional
    public CartResponse applyCoupon(String email, String couponCode) {
        Cart cart = getOrCreateCart(email);
        cart.setCouponCode(couponCode);
        Cart saved = cartRepository.save(cart);
        return promotionEngineService.evaluateCart(saved, couponCode);
    }

    @Override
    @Transactional
    public CartResponse removeCoupon(String email) {
        Cart cart = getOrCreateCart(email);
        cart.setCouponCode(null);
        Cart saved = cartRepository.save(cart);
        return promotionEngineService.evaluateCart(saved, null);
    }

    @Override
    @Transactional
    public CartResponse applyPromotion(String email, Long promotionId) {
        Cart cart = getOrCreateCart(email);
        cart.setManuallySelectedPromotionId(promotionId);
        Cart saved = cartRepository.save(cart);
        return promotionEngineService.evaluateCart(saved, saved.getCouponCode());
    }

    @Override
    @Transactional
    public CartResponse removePromotion(String email) {
        Cart cart = getOrCreateCart(email);
        cart.setManuallySelectedPromotionId(-1L);
        Cart saved = cartRepository.save(cart);
        return promotionEngineService.evaluateCart(saved, saved.getCouponCode());
    }

    @Override
    @Transactional
    public void clearCart(String email) {
        Cart cart = getOrCreateCart(email);
        cart.getItems().clear();
        cart.setCouponCode(null);
        cart.setManuallySelectedPromotionId(null);
        cartRepository.save(cart);
    }

    // ─── Free Item Operations ─────────────────────────────────────────────────

    @Override
    @Transactional
    public CartResponse addFreeItemToCart(String email, Long promotionId, Long variantId) {
        Cart cart = getOrCreateCart(email);

        // Backend validates eligibility — throws IllegalArgumentException if invalid
        promotionEngineService.validateFreeItemEligibility(cart, promotionId, variantId);

        ProductVariant freeVariant = productVariantRepository.findById(variantId)
                .orElseThrow(() -> new ResourceNotFoundException("Variant not found: " + variantId));

        CartItem freeItem = CartItem.builder()
                .cart(cart)
                .product(freeVariant.getProduct())
                .variant(freeVariant)
                .quantity(1)
                .price(BigDecimal.ZERO)
                .freeItem(true)
                .freePromotionId(promotionId)
                .build();

        cart.addItem(freeItem);
        Cart saved = cartRepository.save(cart);

        log.info("[FREE_PRODUCT] Free item added: user={}, promotionId={}, variantId={}",
                email, promotionId, variantId);

        return promotionEngineService.evaluateCart(saved, saved.getCouponCode());
    }

    @Override
    @Transactional
    public CartResponse removeFreeItemFromCart(String email, Long cartItemId) {
        Cart cart = getOrCreateCart(email);

        CartItem item = cart.getItems().stream()
                .filter(i -> i.getId().equals(cartItemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found: " + cartItemId));

        if (!item.isFreeItem())
            throw new IllegalArgumentException(
                    "This item is not a free gift. Use the standard remove endpoint instead.");

        cart.removeItem(item);
        Cart saved = cartRepository.save(cart);

        log.info("[FREE_PRODUCT] Free item removed: user={}, cartItemId={}", email, cartItemId);

        return promotionEngineService.evaluateCart(saved, saved.getCouponCode());
    }

    // ─── Private Helpers ─────────────────────────────────────────────────────

    private Cart getOrCreateCart(String email) {
        return cartRepository.findByUserEmail(email).orElseGet(() -> {
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
            Cart newCart = Cart.builder().user(user).build();
            return cartRepository.save(newCart);
        });
    }
}
