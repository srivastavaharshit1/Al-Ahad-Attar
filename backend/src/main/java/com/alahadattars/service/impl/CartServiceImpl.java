package com.alahadattars.service.impl;

import com.alahadattars.dto.cart.CartItemRequest;
import com.alahadattars.dto.cart.CartResponse;
import com.alahadattars.entity.Cart;
import com.alahadattars.entity.CartItem;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.User;
import com.alahadattars.exception.BadRequestException;
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

    // ─── Guest Cart Evaluation ────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public CartResponse evaluateGuestCart(com.alahadattars.dto.cart.GuestCartRequest request) {
        Cart cart = new Cart();
        cart.setCouponCode(request.getCouponCode());
        cart.setManuallySelectedPromotionId(request.getManuallySelectedPromotionId());

        if (request.getItems() != null) {
            for (com.alahadattars.dto.cart.GuestCartRequest.GuestCartItemRequest itemReq : request.getItems()) {
                ProductVariant variant = productVariantRepository.findById(itemReq.getVariantId()).orElse(null);
                if (variant != null) {
                    CartItem item = CartItem.builder()
                            .cart(cart)
                            .product(variant.getProduct())
                            .variant(variant)
                            .quantity(itemReq.getQuantity())
                            .price(variant.getPrice())
                            .freeItem(itemReq.isFreeItem())
                            .freePromotionId(itemReq.getFreePromotionId())
                            .build();
                    cart.addItem(item);
                }
            }
        }
        return promotionEngineService.evaluateCart(cart, cart.getCouponCode());
    }

    // ─── Standard Cart Operations ─────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public CartResponse getCart(String email) {
        // Not getOrCreateCart(): that helper persists a new Cart row the first time it's called for
        // a user, which this method's readOnly transaction can't do — Postgres correctly rejects
        // the INSERT ("cannot execute INSERT in a read-only transaction"), 500ing on the very first
        // time any new user (or existing user browsing before ever adding anything) views their
        // cart. Viewing an empty cart doesn't need a DB row to exist yet; a transient, unsaved Cart
        // is enough to evaluate against (available promotions, zero items). The real row still gets
        // created lazily via getOrCreateCart the first time addToCart (a writable transaction)
        // actually needs one.
        Cart cart = cartRepository.findByUserEmail(email).orElseGet(() -> {
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
            return Cart.builder().user(user).build();
        });
        return promotionEngineService.evaluateCart(cart, cart.getCouponCode());
    }

    @Override
    @Transactional
    public CartResponse addToCart(String email, CartItemRequest request) {
        Cart cart = getOrCreateCart(email);
        ProductVariant variant = productVariantRepository.findById(request.getVariantId())
                .orElseThrow(() -> new ResourceNotFoundException("Product Variant not found"));

        if (!variant.isActive()) throw new BadRequestException("Product variant is not available");
        if (variant.getStock() < request.getQuantity())
            throw new BadRequestException("Insufficient stock. Available: " + variant.getStock());

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

        pruneStaleFreeItems(cart);
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
            throw new BadRequestException("Quantity of free gifts cannot be changed. Remove and re-add instead.");

        if (quantity <= 0) {
            cart.removeItem(item);
        } else {
            if (item.getVariant().getStock() < quantity)
                throw new BadRequestException("Insufficient stock. Available: " + item.getVariant().getStock());
            item.setQuantity(quantity);
        }

        pruneStaleFreeItems(cart);
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
        pruneStaleFreeItems(cart);
        cartRepository.save(cart);
    }

    @Override
    @Transactional
    public CartResponse applyCoupon(String email, String couponCode) {
        Cart cart = getOrCreateCart(email);
        cart.setCouponCode(couponCode);
        pruneStaleFreeItems(cart);
        Cart saved = cartRepository.save(cart);
        return promotionEngineService.evaluateCart(saved, couponCode);
    }

    @Override
    @Transactional
    public CartResponse removeCoupon(String email) {
        Cart cart = getOrCreateCart(email);
        cart.setCouponCode(null);
        pruneStaleFreeItems(cart);
        Cart saved = cartRepository.save(cart);
        return promotionEngineService.evaluateCart(saved, null);
    }

    @Override
    @Transactional
    public CartResponse applyPromotion(String email, Long promotionId) {
        Cart cart = getOrCreateCart(email);
        cart.setManuallySelectedPromotionId(promotionId);
        pruneStaleFreeItems(cart);
        Cart saved = cartRepository.save(cart);
        return promotionEngineService.evaluateCart(saved, saved.getCouponCode());
    }

    @Override
    @Transactional
    public CartResponse removePromotion(String email) {
        Cart cart = getOrCreateCart(email);
        cart.setManuallySelectedPromotionId(-1L);
        pruneStaleFreeItems(cart);
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
        pruneStaleFreeItems(cart);
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
            throw new BadRequestException(
                    "This item is not a free gift. Use the standard remove endpoint instead.");

        cart.removeItem(item);
        pruneStaleFreeItems(cart);
        Cart saved = cartRepository.save(cart);

        log.info("[FREE_PRODUCT] Free item removed: user={}, cartItemId={}", email, cartItemId);

        return promotionEngineService.evaluateCart(saved, saved.getCouponCode());
    }

    // ─── Private Helpers ─────────────────────────────────────────────────────

    /**
     * Removes any free cart item whose promotion no longer covers it (qualifying paid item
     * removed, promotion expired/deactivated, chosen variant out of stock, etc). Previously the
     * engine only warned about this (evaluateCart's unlockMessages) and left the stale item sitting
     * in the cart indefinitely — checkout still correctly rejected it
     * (PromotionEngineServiceImpl.validateFreeItemEligibility), but the cart view kept showing it as
     * if it were still valid. orphanRemoval=true on Cart.items means removing from this in-memory
     * list deletes the row on flush, no extra repository call needed.
     */
    private void pruneStaleFreeItems(Cart cart) {
        cart.getItems().removeIf(item -> item.isFreeItem() && !promotionEngineService.isFreeCartItemStillValid(cart, item));
    }

    private Cart getOrCreateCart(String email) {
        return cartRepository.findByUserEmail(email).orElseGet(() -> {
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
            Cart newCart = Cart.builder().user(user).build();
            return cartRepository.save(newCart);
        });
    }
}
