package com.alahadattars.service;

import com.alahadattars.dto.giftset.GiftSetImageResponse;
import com.alahadattars.dto.giftset.GiftSetRequest;
import com.alahadattars.dto.giftset.GiftSetResponse;
import com.alahadattars.entity.GiftSet;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface GiftSetService {

    // Storefront public operations
    List<GiftSetResponse> getAllActiveGiftSets();

    List<GiftSetResponse> getFeaturedGiftSets();

    GiftSetResponse getGiftSetBySlug(String slug);

    // Dynamic stock availability calculation
    int calculateAvailableStock(GiftSet giftSet);

    // Admin operations
    Page<GiftSetResponse> getAllGiftSetsAdmin(Pageable pageable);

    GiftSetResponse getGiftSetByIdAdmin(Long id);

    GiftSetResponse createGiftSet(GiftSetRequest request);

    GiftSetResponse updateGiftSet(Long id, GiftSetRequest request);

    void deleteGiftSet(Long id);

    GiftSetResponse toggleStatus(Long id, boolean active);

    GiftSetImageResponse uploadImage(Long giftSetId, MultipartFile file);

    void deleteImage(Long imageId);

    GiftSetImageResponse setPrimaryImage(Long imageId);

    List<GiftSetImageResponse> reorderImages(Long giftSetId, List<Long> imageIds);

    GiftSetResponse mapToResponse(GiftSet giftSet);
}

