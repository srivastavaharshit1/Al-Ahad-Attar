package com.alahadattars.service;

import com.alahadattars.dto.wishlist.WishlistResponse;

import java.util.List;

public interface WishlistService {
    
    List<WishlistResponse> getUserWishlist(String email);
    
    WishlistResponse addToWishlist(String email, Long variantId);
    
    void removeFromWishlist(String email, Long variantId);
}
