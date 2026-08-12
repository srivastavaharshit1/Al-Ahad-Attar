package com.alahadattars.controller;

import com.alahadattars.dto.cart.CartItemRequest;
import com.alahadattars.dto.cart.CartResponse;
import com.alahadattars.dto.cart.FreeProductOptionResponse;
import com.alahadattars.entity.Cart;
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.repository.CartRepository;
import com.alahadattars.response.ApiResponse;
import com.alahadattars.service.CartService;
import com.alahadattars.service.PromotionEngineService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
@Tag(name = "Cart", description = "APIs for managing shopping cart")
public class CartController {

    private final CartService cartService;
    private final PromotionEngineService promotionEngineService;
    private final CartRepository cartRepository;

    // ─── Standard Cart Endpoints ──────────────────────────────────────────────

    @Operation(summary = "Get current user's cart with pricing and free product options")
    @GetMapping
    public ResponseEntity<ApiResponse<CartResponse>> getCart() {
        String email = getEmail();
        return ok(cartService.getCart(email), "Cart retrieved");
    }

    @Operation(summary = "Add an item to the cart")
    @PostMapping("/items")
    public ResponseEntity<ApiResponse<CartResponse>> addToCart(@Valid @RequestBody CartItemRequest request) {
        return ok(cartService.addToCart(getEmail(), request), "Item added to cart");
    }

    @Operation(summary = "Update cart item quantity")
    @PutMapping("/items/{cartItemId}")
    public ResponseEntity<ApiResponse<CartResponse>> updateQuantity(
            @PathVariable Long cartItemId, @RequestParam Integer quantity) {
        return ok(cartService.updateQuantity(getEmail(), cartItemId, quantity), "Cart updated");
    }

    @Operation(summary = "Remove a regular item from the cart")
    @DeleteMapping("/items/{cartItemId}")
    public ResponseEntity<ApiResponse<Void>> removeFromCart(@PathVariable Long cartItemId) {
        cartService.removeFromCart(getEmail(), cartItemId);
        return ResponseEntity.ok(ApiResponse.<Void>builder().success(true).message("Item removed").build());
    }

    @Operation(summary = "Clear the entire cart")
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> clearCart() {
        cartService.clearCart(getEmail());
        return ResponseEntity.ok(ApiResponse.<Void>builder().success(true).message("Cart cleared").build());
    }

    @Operation(summary = "Apply a coupon code to the cart")
    @PostMapping("/coupon")
    public ResponseEntity<ApiResponse<CartResponse>> applyCoupon(@RequestParam String couponCode) {
        return ok(cartService.applyCoupon(getEmail(), couponCode), "Coupon applied");
    }

    @Operation(summary = "Remove applied coupon from the cart")
    @DeleteMapping("/coupon")
    public ResponseEntity<ApiResponse<CartResponse>> removeCoupon() {
        return ok(cartService.removeCoupon(getEmail()), "Coupon removed");
    }

    @Operation(summary = "Manually apply a promotion to the cart")
    @PostMapping("/promotions/{promotionId}")
    public ResponseEntity<ApiResponse<CartResponse>> applyPromotion(@PathVariable Long promotionId) {
        return ok(cartService.applyPromotion(getEmail(), promotionId), "Promotion applied");
    }

    @Operation(summary = "Remove manually selected promotion")
    @DeleteMapping("/promotions")
    public ResponseEntity<ApiResponse<CartResponse>> removePromotion() {
        return ok(cartService.removePromotion(getEmail()), "Promotion removed");
    }

    // ─── FREE_PRODUCT Promotion Endpoints ────────────────────────────────────

    @Operation(summary = "Get eligible free product options from the promotion engine")
    @GetMapping("/free-product-options")
    public ResponseEntity<ApiResponse<List<FreeProductOptionResponse>>> getFreeProductOptions() {
        String email = getEmail();
        Optional<Cart> cartOpt = cartRepository.findByUserEmail(email);
        if (cartOpt.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.<List<FreeProductOptionResponse>>builder()
                    .success(true).data(List.of()).build());
        }
        Cart cart = cartOpt.get();
        List<FreeProductOptionResponse> options =
                promotionEngineService.evaluateFreeProductOptions(cart, cart.getCouponCode());
        return ResponseEntity.ok(ApiResponse.<List<FreeProductOptionResponse>>builder()
                .success(true)
                .message("Eligible free product options retrieved")
                .data(options)
                .build());
    }

    @Operation(summary = "Add a free item to the cart — backend validates eligibility via Promotion Engine")
    @PostMapping("/free-product")
    public ResponseEntity<ApiResponse<CartResponse>> addFreeProduct(@RequestBody Map<String, Long> body) {
        Long promotionId = body.get("promotionId");
        Long variantId = body.get("variantId");
        if (promotionId == null || variantId == null)
            throw new BadRequestException("Both 'promotionId' and 'variantId' are required.");
        return ok(cartService.addFreeItemToCart(getEmail(), promotionId, variantId), "Free item added to cart");
    }

    @Operation(summary = "Remove a free gift item from the cart")
    @DeleteMapping("/free-product/{cartItemId}")
    public ResponseEntity<ApiResponse<CartResponse>> removeFreeProduct(@PathVariable Long cartItemId) {
        return ok(cartService.removeFreeItemFromCart(getEmail(), cartItemId), "Free item removed from cart");
    }

    // ─── Private Helpers ─────────────────────────────────────────────────────

    private String getEmail() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    private <T> ResponseEntity<ApiResponse<T>> ok(T data, String message) {
        return ResponseEntity.ok(ApiResponse.<T>builder().success(true).message(message).data(data).build());
    }
}
