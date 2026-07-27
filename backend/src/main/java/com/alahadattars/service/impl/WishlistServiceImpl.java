package com.alahadattars.service.impl;

import com.alahadattars.dto.wishlist.WishlistResponse;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.User;
import com.alahadattars.entity.WishlistItem;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.mapper.ProductVariantMapper;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.UserRepository;
import com.alahadattars.repository.WishlistRepository;
import com.alahadattars.service.WishlistService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WishlistServiceImpl implements WishlistService {

    private final WishlistRepository wishlistRepository;
    private final UserRepository userRepository;
    private final ProductVariantRepository variantRepository;
    private final ProductVariantMapper variantMapper;

    @Override
    @Transactional(readOnly = true)
    public List<WishlistResponse> getUserWishlist(String email) {
        return wishlistRepository.findByUserEmailOrderByCreatedAtDesc(email).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public WishlistResponse addToWishlist(String email, Long variantId) {
        if (wishlistRepository.existsByUserEmailAndVariantId(email, variantId)) {
            return mapToResponse(wishlistRepository.findByUserEmailAndVariantId(email, variantId).get());
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ProductVariant variant = variantRepository.findById(variantId)
                .orElseThrow(() -> new ResourceNotFoundException("Product Variant not found"));

        WishlistItem item = WishlistItem.builder()
                .user(user)
                .variant(variant)
                .build();

        return mapToResponse(wishlistRepository.save(item));
    }

    @Override
    @Transactional
    public void removeFromWishlist(String email, Long variantId) {
        WishlistItem item = wishlistRepository.findByUserEmailAndVariantId(email, variantId)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found in wishlist"));
                
        wishlistRepository.delete(item);
    }

    private WishlistResponse mapToResponse(WishlistItem item) {
        return WishlistResponse.builder()
                .id(item.getId())
                .variant(variantMapper.toResponse(item.getVariant()))
                .createdAt(item.getCreatedAt())
                .build();
    }
}
