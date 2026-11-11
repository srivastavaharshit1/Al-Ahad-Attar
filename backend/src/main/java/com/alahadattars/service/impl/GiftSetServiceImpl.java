package com.alahadattars.service.impl;

import com.alahadattars.dto.giftset.GiftSetImageResponse;
import com.alahadattars.dto.giftset.GiftSetItemRequest;
import com.alahadattars.dto.giftset.GiftSetItemResponse;
import com.alahadattars.dto.giftset.GiftSetRequest;
import com.alahadattars.dto.giftset.GiftSetResponse;
import com.alahadattars.entity.GiftSet;
import com.alahadattars.entity.GiftSetImage;
import com.alahadattars.entity.GiftSetItem;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.repository.GiftSetImageRepository;
import com.alahadattars.repository.GiftSetItemRepository;
import com.alahadattars.repository.GiftSetRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.service.GiftSetService;
import com.alahadattars.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GiftSetServiceImpl implements GiftSetService {

    private final GiftSetRepository giftSetRepository;
    private final GiftSetItemRepository giftSetItemRepository;
    private final GiftSetImageRepository giftSetImageRepository;
    private final ProductVariantRepository productVariantRepository;
    private final StorageService storageService;

    @Override
    @Transactional(readOnly = true)
    public List<GiftSetResponse> getAllActiveGiftSets() {
        return giftSetRepository.findByActiveTrueOrderByDisplayOrderAsc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<GiftSetResponse> getFeaturedGiftSets() {
        return giftSetRepository.findByFeaturedTrueAndActiveTrueOrderByDisplayOrderAsc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public GiftSetResponse getGiftSetBySlug(String slug) {
        GiftSet giftSet = giftSetRepository.findBySlugWithItemsEager(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Gift set not found with slug: " + slug));
        return mapToResponse(giftSet);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<GiftSetResponse> getAllGiftSetsAdmin(Pageable pageable) {
        return giftSetRepository.findAll(pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public GiftSetResponse getGiftSetByIdAdmin(Long id) {
        GiftSet giftSet = giftSetRepository.findByIdWithItemsEager(id)
                .orElseThrow(() -> new ResourceNotFoundException("Gift set not found with id: " + id));
        return mapToResponse(giftSet);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"products", "homepage"}, allEntries = true)
    public GiftSetResponse createGiftSet(GiftSetRequest request) {
        validateGiftSetRequest(request, null);

        String slug = resolveSlug(request.getName(), request.getSlug(), null);

        GiftSet giftSet = GiftSet.builder()
                .name(request.getName().trim())
                .slug(slug)
                .description(request.getDescription())
                .price(request.getPrice())
                .salePrice(request.getSalePrice())
                .active(request.isActive())
                .featured(request.isFeatured())
                .packagingNotes(request.getPackagingNotes())
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .items(new ArrayList<>())
                .images(new ArrayList<>())
                .build();

        populateComponents(giftSet, request.getItems());

        GiftSet saved = giftSetRepository.save(giftSet);
        log.info("Created gift set: '{}' (ID: {}, Slug: {})", saved.getName(), saved.getId(), saved.getSlug());
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"products", "homepage"}, allEntries = true)
    public GiftSetResponse updateGiftSet(Long id, GiftSetRequest request) {
        GiftSet giftSet = giftSetRepository.findByIdWithItemsEager(id)
                .orElseThrow(() -> new ResourceNotFoundException("Gift set not found with id: " + id));

        validateGiftSetRequest(request, id);

        String slug = resolveSlug(request.getName(), request.getSlug(), id);

        giftSet.setName(request.getName().trim());
        giftSet.setSlug(slug);
        giftSet.setDescription(request.getDescription());
        giftSet.setPrice(request.getPrice());
        giftSet.setSalePrice(request.getSalePrice());
        giftSet.setActive(request.isActive());
        giftSet.setFeatured(request.isFeatured());
        giftSet.setPackagingNotes(request.getPackagingNotes());
        if (request.getDisplayOrder() != null) {
            giftSet.setDisplayOrder(request.getDisplayOrder());
        }

        // Reconcile components in place to preserve IDs, foreign keys, and unique constraint
        reconcileComponents(giftSet, request.getItems());

        GiftSet saved = giftSetRepository.save(giftSet);
        log.info("Updated gift set: '{}' (ID: {})", saved.getName(), saved.getId());
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"products", "homepage"}, allEntries = true)
    public void deleteGiftSet(Long id) {
        GiftSet giftSet = giftSetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Gift set not found with id: " + id));

        // Soft-deactivation is the primary lifecycle rule.
        // If hard deletion is attempted, check whether orders reference it.
        giftSet.setActive(false);
        giftSetRepository.save(giftSet);
        log.info("Deactivated/archived gift set: '{}' (ID: {})", giftSet.getName(), id);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"products", "homepage"}, allEntries = true)
    public GiftSetResponse toggleStatus(Long id, boolean active) {
        GiftSet giftSet = giftSetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Gift set not found with id: " + id));
        giftSet.setActive(active);
        GiftSet saved = giftSetRepository.save(giftSet);
        log.info("Toggled gift set status '{}' (ID: {}) to active={}", saved.getName(), id, active);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"products", "homepage"}, allEntries = true)
    public GiftSetImageResponse uploadImage(Long giftSetId, MultipartFile file) {
        if (file.isEmpty()) {
            throw new BadRequestException("File is empty");
        }

        GiftSet giftSet = giftSetRepository.findById(giftSetId)
                .orElseThrow(() -> new ResourceNotFoundException("Gift set not found with id: " + giftSetId));

        int currentCount = giftSetImageRepository.countByGiftSetAndActiveTrue(giftSet);
        if (currentCount >= 10) {
            throw new BadRequestException("Maximum 10 images allowed per gift set");
        }

        String objectKey = storageService.uploadFile(file, "gift-sets/" + giftSetId);
        boolean isFirst = (currentCount == 0);

        GiftSetImage image = GiftSetImage.builder()
                .giftSet(giftSet)
                .imageUrl(objectKey)
                .displayOrder(currentCount)
                .isPrimary(isFirst)
                .active(true)
                .build();

        giftSet.addImage(image);
        GiftSetImage savedImage = giftSetImageRepository.save(image);
        log.info("Uploaded image ID: {} for gift set ID: {}", savedImage.getId(), giftSetId);

        return mapImageToResponse(savedImage);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"products", "homepage"}, allEntries = true)
    public void deleteImage(Long imageId) {
        GiftSetImage image = giftSetImageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("Image not found with id: " + imageId));

        GiftSet giftSet = image.getGiftSet();
        boolean wasPrimary = image.isPrimary();

        image.setActive(false);
        giftSetImageRepository.save(image);

        try {
            storageService.deleteFile(image.getImageUrl());
        } catch (Exception e) {
            log.warn("Could not delete physical file for gift set image {}: {}", imageId, e.getMessage());
        }

        if (wasPrimary) {
            List<GiftSetImage> remaining = giftSetImageRepository.findByGiftSetAndActiveTrueOrderByDisplayOrderAsc(giftSet);
            if (!remaining.isEmpty()) {
                GiftSetImage newPrimary = remaining.get(0);
                newPrimary.setPrimary(true);
                giftSetImageRepository.save(newPrimary);
            }
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = {"products", "homepage"}, allEntries = true)
    public GiftSetImageResponse setPrimaryImage(Long imageId) {
        GiftSetImage image = giftSetImageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("Image not found with id: " + imageId));

        if (!image.isActive()) {
            throw new BadRequestException("Cannot set inactive image as primary");
        }

        giftSetImageRepository.resetPrimaryForGiftSet(image.getGiftSet());
        image.setPrimary(true);
        GiftSetImage saved = giftSetImageRepository.save(image);
        return mapImageToResponse(saved);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"products", "homepage"}, allEntries = true)
    public List<GiftSetImageResponse> reorderImages(Long giftSetId, List<Long> imageIds) {
        GiftSet giftSet = giftSetRepository.findById(giftSetId)
                .orElseThrow(() -> new ResourceNotFoundException("Gift set not found with id: " + giftSetId));

        List<GiftSetImage> images = giftSetImageRepository.findByGiftSetAndActiveTrueOrderByDisplayOrderAsc(giftSet);
        for (int i = 0; i < imageIds.size(); i++) {
            Long targetId = imageIds.get(i);
            for (GiftSetImage img : images) {
                if (img.getId().equals(targetId)) {
                    img.setDisplayOrder(i);
                    break;
                }
            }
        }
        giftSetImageRepository.saveAll(images);
        return images.stream().map(this::mapImageToResponse).collect(Collectors.toList());
    }

    @Override
    public int calculateAvailableStock(GiftSet giftSet) {
        if (giftSet == null || !giftSet.isActive() || giftSet.getItems() == null || giftSet.getItems().isEmpty()) {
            return 0;
        }

        int minAvailable = Integer.MAX_VALUE;

        for (GiftSetItem item : giftSet.getItems()) {
            ProductVariant variant = item.getVariant();
            if (variant == null || !variant.isActive() || variant.getStock() == null || variant.getStock() <= 0) {
                return 0;
            }

            int requiredPerSet = item.getQuantity() != null && item.getQuantity() > 0 ? item.getQuantity() : 1;
            int availableSetsForComponent = variant.getStock() / requiredPerSet;

            if (availableSetsForComponent < minAvailable) {
                minAvailable = availableSetsForComponent;
            }
        }

        return minAvailable == Integer.MAX_VALUE ? 0 : minAvailable;
    }

    @Override
    public GiftSetResponse mapToResponse(GiftSet giftSet) {
        int availableStock = calculateAvailableStock(giftSet);
        boolean inStock = giftSet.isActive() && (availableStock > 0);

        List<GiftSetImageResponse> imageResponses = giftSet.getImages() != null
                ? giftSet.getImages().stream()
                .filter(GiftSetImage::isActive)
                .map(this::mapImageToResponse)
                .collect(Collectors.toList())
                : new ArrayList<>();

        String primaryImageUrl = imageResponses.stream()
                .filter(GiftSetImageResponse::isPrimary)
                .findFirst()
                .map(GiftSetImageResponse::getImageUrl)
                .orElse(!imageResponses.isEmpty() ? imageResponses.get(0).getImageUrl() : null);

        List<GiftSetItemResponse> itemResponses = giftSet.getItems() != null
                ? giftSet.getItems().stream()
                .map(item -> {
                    ProductVariant v = item.getVariant();
                    Product p = item.getProduct();
                    return GiftSetItemResponse.builder()
                            .id(item.getId())
                            .productId(p != null ? p.getId() : null)
                            .productName(p != null ? p.getName() : null)
                            .productSlug(p != null ? p.getSlug() : null)
                            .variantId(v != null ? v.getId() : null)
                            .variantSize(v != null ? v.getSize() : null)
                            .sku(v != null ? v.getSku() : null)
                            .variantOriginalPrice(v != null ? v.getPrice() : null)
                            .quantity(item.getQuantity())
                            .displayOrder(item.getDisplayOrder())
                            .currentVariantStock(v != null ? v.getStock() : 0)
                            .productImage(resolvePrimaryProductImage(p))
                            .build();
                })
                .collect(Collectors.toList())
                : new ArrayList<>();

        return GiftSetResponse.builder()
                .id(giftSet.getId())
                .name(giftSet.getName())
                .slug(giftSet.getSlug())
                .description(giftSet.getDescription())
                .price(giftSet.getPrice())
                .salePrice(giftSet.getSalePrice())
                .active(giftSet.isActive())
                .featured(giftSet.isFeatured())
                .packagingNotes(giftSet.getPackagingNotes())
                .displayOrder(giftSet.getDisplayOrder())
                .inStock(inStock)
                .availableStock(availableStock)
                .primaryImageUrl(primaryImageUrl)
                .images(imageResponses)
                .items(itemResponses)
                .createdAt(giftSet.getCreatedAt())
                .updatedAt(giftSet.getUpdatedAt())
                .build();
    }

    private GiftSetImageResponse mapImageToResponse(GiftSetImage image) {
        String resolvedUrl = storageService.resolveUrl(
                image.getImageUrl(),
                "/api/gift-sets/images/" + image.getId() + "/file"
        );

        return GiftSetImageResponse.builder()
                .id(image.getId())
                .imageUrl(resolvedUrl)
                .displayOrder(image.getDisplayOrder())
                .isPrimary(image.isPrimary())
                .altText(image.getAltText())
                .build();
    }

    private String resolvePrimaryProductImage(Product product) {
        if (product == null || product.getImages() == null || product.getImages().isEmpty()) {
            return null;
        }
        return product.getImages().stream()
                .filter(img -> img.isActive() && img.isPrimary())
                .findFirst()
                .map(img -> storageService.resolveUrl(img.getImageUrl(), "/api/images/" + img.getId() + "/file"))
                .orElseGet(() -> product.getImages().stream()
                        .filter(com.alahadattars.entity.ProductImage::isActive)
                        .findFirst()
                        .map(img -> storageService.resolveUrl(img.getImageUrl(), "/api/images/" + img.getId() + "/file"))
                        .orElse(null));
    }

    private void validateGiftSetRequest(GiftSetRequest request, Long existingId) {
        if (request.getPrice() == null || request.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Gift set price must be greater than zero");
        }
        if (request.getSalePrice() != null) {
            if (request.getSalePrice().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BadRequestException("Sale price must be greater than zero");
            }
            if (request.getSalePrice().compareTo(request.getPrice()) > 0) {
                throw new BadRequestException("Sale price cannot be greater than the regular price");
            }
        }
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new BadRequestException("Gift set must contain at least one item");
        }

        Set<Long> seenVariants = new HashSet<>();
        for (GiftSetItemRequest itemReq : request.getItems()) {
            if (itemReq.getVariantId() == null) {
                throw new BadRequestException("Variant ID cannot be null");
            }
            if (!seenVariants.add(itemReq.getVariantId())) {
                throw new BadRequestException("Duplicate variant ID in gift set: " + itemReq.getVariantId());
            }
            if (itemReq.getQuantity() == null || itemReq.getQuantity() < 1) {
                throw new BadRequestException("Component quantity must be at least 1");
            }
        }
    }

    private void populateComponents(GiftSet giftSet, List<GiftSetItemRequest> itemRequests) {
        int order = 0;
        for (GiftSetItemRequest itemReq : itemRequests) {
            ProductVariant variant = productVariantRepository.findById(itemReq.getVariantId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product variant not found with ID: " + itemReq.getVariantId()));

            if (!variant.isActive()) {
                throw new BadRequestException("Cannot include inactive product variant: " + variant.getSku());
            }

            Product product = variant.getProduct();
            if (product == null || !product.isActive()) {
                throw new BadRequestException("Cannot include variant from inactive product");
            }

            GiftSetItem item = GiftSetItem.builder()
                    .giftSet(giftSet)
                    .product(product)
                    .variant(variant)
                    .quantity(itemReq.getQuantity())
                    .displayOrder(itemReq.getDisplayOrder() != null ? itemReq.getDisplayOrder() : order++)
                    .build();

            giftSet.addItem(item);
        }
    }

    /**
     * Reconciles existing gift set items with requested items in place.
     * Prevents Hibernate from executing duplicate collection INSERTs before DELETEs,
     * maintaining strict compliance with unique constraint uq_gift_set_item_variant.
     */
    private void reconcileComponents(GiftSet giftSet, List<GiftSetItemRequest> itemRequests) {
        Map<Long, GiftSetItemRequest> requestMap = new LinkedHashMap<>();
        for (GiftSetItemRequest req : itemRequests) {
            requestMap.put(req.getVariantId(), req);
        }

        // 1. Remove components no longer present in the updated request
        Iterator<GiftSetItem> iterator = giftSet.getItems().iterator();
        while (iterator.hasNext()) {
            GiftSetItem existing = iterator.next();
            Long existingVariantId = existing.getVariant() != null ? existing.getVariant().getId() : null;
            if (existingVariantId == null || !requestMap.containsKey(existingVariantId)) {
                existing.setGiftSet(null);
                iterator.remove();
            }
        }

        // 2. Map remaining items by variantId for in-place lookup
        Map<Long, GiftSetItem> existingMap = new HashMap<>();
        for (GiftSetItem item : giftSet.getItems()) {
            if (item.getVariant() != null && item.getVariant().getId() != null) {
                existingMap.put(item.getVariant().getId(), item);
            }
        }

        // 3. Update existing components in place or create newly added components
        for (int i = 0; i < itemRequests.size(); i++) {
            GiftSetItemRequest itemReq = itemRequests.get(i);
            int displayOrder = itemReq.getDisplayOrder() != null ? itemReq.getDisplayOrder() : i;

            GiftSetItem existing = existingMap.get(itemReq.getVariantId());
            if (existing != null) {
                // Ensure existing variant and product are active
                ProductVariant variant = existing.getVariant();
                if (!variant.isActive()) {
                    throw new BadRequestException("Cannot include inactive product variant: " + variant.getSku());
                }
                Product product = existing.getProduct();
                if (product == null || !product.isActive()) {
                    throw new BadRequestException("Cannot include variant from inactive product");
                }

                // In-place mutation: preserves row identity and avoids duplicate key INSERTs
                existing.setQuantity(itemReq.getQuantity());
                existing.setDisplayOrder(displayOrder);
            } else {
                // Newly added variant
                ProductVariant variant = productVariantRepository.findById(itemReq.getVariantId())
                        .orElseThrow(() -> new ResourceNotFoundException("Product variant not found with ID: " + itemReq.getVariantId()));

                if (!variant.isActive()) {
                    throw new BadRequestException("Cannot include inactive product variant: " + variant.getSku());
                }

                Product product = variant.getProduct();
                if (product == null || !product.isActive()) {
                    throw new BadRequestException("Cannot include variant from inactive product");
                }

                GiftSetItem newItem = GiftSetItem.builder()
                        .giftSet(giftSet)
                        .product(product)
                        .variant(variant)
                        .quantity(itemReq.getQuantity())
                        .displayOrder(displayOrder)
                        .build();

                giftSet.addItem(newItem);
            }
        }
    }

    private String resolveSlug(String name, String customSlug, Long existingId) {
        String baseSlug = (customSlug != null && !customSlug.trim().isEmpty())
                ? customSlug.trim().toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)+", "")
                : name.trim().toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)+", "");

        if (baseSlug.isEmpty()) {
            baseSlug = "gift-set";
        }

        String candidate = baseSlug;
        int counter = 1;

        while (isSlugTaken(candidate, existingId)) {
            candidate = baseSlug + "-" + counter;
            counter++;
        }

        return candidate;
    }

    private boolean isSlugTaken(String slug, Long existingId) {
        if (existingId == null) {
            return giftSetRepository.existsBySlug(slug);
        } else {
            return giftSetRepository.existsBySlugAndIdNot(slug, existingId);
        }
    }
}
