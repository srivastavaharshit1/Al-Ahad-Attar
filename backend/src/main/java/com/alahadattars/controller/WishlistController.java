package com.alahadattars.controller;

import com.alahadattars.dto.wishlist.WishlistResponse;
import com.alahadattars.response.ApiResponse;
import com.alahadattars.service.WishlistService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/wishlist")
@RequiredArgsConstructor
@Tag(name = "Wishlist", description = "APIs for managing customer wishlist")
public class WishlistController {

    private final WishlistService wishlistService;

    @Operation(summary = "Get user's wishlist")
    @GetMapping
    public ResponseEntity<ApiResponse<List<WishlistResponse>>> getUserWishlist() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info("Fetching wishlist for user: {}", email);
        List<WishlistResponse> response = wishlistService.getUserWishlist(email);
        return ResponseEntity.ok(ApiResponse.<List<WishlistResponse>>builder()
                .success(true)
                .message("Wishlist retrieved successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Add an item to the wishlist")
    @PostMapping("/{variantId}")
    public ResponseEntity<ApiResponse<WishlistResponse>> addToWishlist(@PathVariable Long variantId) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info("Adding variant {} to wishlist for user: {}", variantId, email);
        WishlistResponse response = wishlistService.addToWishlist(email, variantId);
        return ResponseEntity.ok(ApiResponse.<WishlistResponse>builder()
                .success(true)
                .message("Item added to wishlist")
                .data(response)
                .build());
    }

    @Operation(summary = "Remove an item from the wishlist")
    @DeleteMapping("/{variantId}")
    public ResponseEntity<ApiResponse<Void>> removeFromWishlist(@PathVariable Long variantId) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info("Removing variant {} from wishlist for user: {}", variantId, email);
        wishlistService.removeFromWishlist(email, variantId);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Item removed from wishlist")
                .build());
    }
}
