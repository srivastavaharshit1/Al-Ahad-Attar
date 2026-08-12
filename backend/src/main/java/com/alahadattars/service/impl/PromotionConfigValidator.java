package com.alahadattars.service.impl;

import com.alahadattars.dto.promotion.PromotionRequest;
import com.alahadattars.entity.PromotionConfiguration;
import com.alahadattars.enums.DiscountType;
import com.alahadattars.enums.PromotionScope;
import com.alahadattars.enums.PromotionType;
import com.alahadattars.entity.Product;
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.ProductRepository;
import com.alahadattars.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Save-time sanity checks for a promotion's configuration — rejects nonsensical setups (zero/
 * negative quantities, a scope pointing at a category/product that doesn't exist or doesn't
 * match, a size configured that no eligible product actually has) instead of silently persisting
 * a promotion that can never trigger. Kept as a standalone component rather than a new service
 * layer since no PromotionServiceImpl exists — AdminPromotionController builds/saves entities
 * directly and is the only caller.
 */
@Component
@RequiredArgsConstructor
public class PromotionConfigValidator {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;

    public void validate(PromotionRequest request) {
        if (request.getStartDate() != null && request.getEndDate() != null
                && request.getStartDate().isAfter(request.getEndDate())) {
            throw new BadRequestException("Start date must be before end date.");
        }

        if (request.getDiscountValue() != null) {
            if (request.getDiscountValue().compareTo(BigDecimal.ZERO) < 0) {
                throw new BadRequestException("Discount value cannot be negative.");
            }
            if (request.getDiscountType() == DiscountType.PERCENTAGE
                    && request.getDiscountValue().compareTo(new BigDecimal("100")) > 0) {
                throw new BadRequestException("Percentage discount cannot exceed 100.");
            }
        }

        if (request.getPromotionType() != PromotionType.FREE_PRODUCT) return;

        PromotionConfiguration config = request.getConfiguration();
        if (config == null) throw new BadRequestException("Free product promotions require a configuration.");

        int minQty = config.getMinPurchaseQuantity() != null ? config.getMinPurchaseQuantity() : 1;
        if (minQty <= 0) throw new BadRequestException("Minimum purchase quantity must be greater than zero.");
        int maxFree = config.getMaxFreeQuantity() != null ? config.getMaxFreeQuantity() : 1;
        if (maxFree <= 0) throw new BadRequestException("Free quantity must be greater than zero.");

        validateBuySide(config);
        validateFreeSide(config);
    }

    private void validateBuySide(PromotionConfiguration config) {
        if (config.getBuyScope() == null) return; // legacy configs skip the new checks entirely

        switch (config.getBuyScope()) {
            case CATEGORY -> {
                Long catId = requireCategory(config.getBuyCategoryId(), "Buy");
                if (!hasSizeMatch(productVariantRepository.findEligibleVariantsByCategories(List.of(catId)),
                        config.getBuyVariantSizes(), config.getBuyVariantSize())) {
                    throw new BadRequestException(
                            "No active product in the selected buy category has the configured qualifying size(s) — this promotion could never trigger.");
                }
            }
            case SPECIFIC_PRODUCT -> {
                Long productId = requireProduct(config.getBuyProductId(), config.getBuyCategoryId(), "Buy");
                if (productId != null && !hasSizeMatch(
                        productVariantRepository.findEligibleVariantsByProducts(List.of(productId)),
                        config.getBuyVariantSizes(), config.getBuyVariantSize())) {
                    throw new BadRequestException(
                            "The selected buy product has no active variant matching the configured qualifying size(s).");
                }
            }
            case ANY_PRODUCT -> {
                // No category/product to validate; size (if any) is checked against the whole
                // active catalog only when actually configured, to avoid an expensive full-catalog
                // scan on every save for the common "no size restriction" case.
                boolean hasSize = (config.getBuyVariantSizes() != null && !config.getBuyVariantSizes().isEmpty())
                        || (config.getBuyVariantSize() != null && !config.getBuyVariantSize().isBlank());
                if (hasSize && !hasSizeMatch(productVariantRepository.findByActiveTrue(),
                        config.getBuyVariantSizes(), config.getBuyVariantSize())) {
                    throw new BadRequestException(
                            "No active product has the configured qualifying size(s) — this promotion could never trigger.");
                }
            }
        }
    }

    private void validateFreeSide(PromotionConfiguration config) {
        if (config.getFreeScope() == null) return; // legacy configs skip the new checks entirely

        switch (config.getFreeScope()) {
            case CATEGORY -> {
                Long catId = requireCategory(firstOrNull(config.getFreeCategoryIds()), "Free gift");
                if (!hasSizeMatch(productVariantRepository.findEligibleVariantsByCategories(List.of(catId)),
                        config.getFreeVariantSizes(), config.getAllowedFreeVariantSize())) {
                    throw new BadRequestException(
                            "No active product in the selected free-gift category has the configured size(s) — no gift would ever be offered.");
                }
            }
            case SPECIFIC_PRODUCT -> {
                Long productId = requireProduct(firstOrNull(config.getFreeProductIds()), firstOrNull(config.getFreeCategoryIds()), "Free gift");
                if (productId != null && !hasSizeMatch(
                        productVariantRepository.findEligibleVariantsByProducts(List.of(productId)),
                        config.getFreeVariantSizes(), config.getAllowedFreeVariantSize())) {
                    throw new BadRequestException(
                            "The selected free-gift product has no active variant matching the configured size(s).");
                }
            }
            case ANY_PRODUCT -> {
                boolean hasSize = (config.getFreeVariantSizes() != null && !config.getFreeVariantSizes().isEmpty())
                        || (config.getAllowedFreeVariantSize() != null && !config.getAllowedFreeVariantSize().isBlank());
                if (hasSize && !hasSizeMatch(productVariantRepository.findByActiveTrue(),
                        config.getFreeVariantSizes(), config.getAllowedFreeVariantSize())) {
                    throw new BadRequestException(
                            "No active product has the configured free-gift size(s) — no gift would ever be offered.");
                }
            }
        }
    }

    private Long requireCategory(Long categoryId, String side) {
        if (categoryId == null) throw new BadRequestException(side + " scope is CATEGORY but no category was selected.");
        if (!categoryRepository.existsById(categoryId)) throw new BadRequestException(side + " category does not exist.");
        return categoryId;
    }

    /** Returns the resolved product id, and — if a category is also configured — verifies they agree. */
    private Long requireProduct(Long productId, Long categoryId, String side) {
        if (productId == null) return null; // e.g. free side may rely on freeVariantIds instead
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new BadRequestException(side + " product does not exist."));
        if (categoryId != null) {
            Long actualCategoryId = product.getCategory() != null ? product.getCategory().getId() : null;
            if (!categoryId.equals(actualCategoryId)) {
                throw new BadRequestException(side + " product does not belong to the selected " + side.toLowerCase() + " category.");
            }
        }
        return productId;
    }

    private boolean hasSizeMatch(List<com.alahadattars.entity.ProductVariant> candidates, List<String> sizes, String legacySingle) {
        List<String> effective = (sizes != null && !sizes.isEmpty()) ? sizes
                : (legacySingle != null && !legacySingle.isBlank()) ? List.of(legacySingle) : null;
        if (effective == null) return true; // no size constraint configured — any variant counts
        List<String> normalizedAllowed = effective.stream()
                .map(s -> s.toLowerCase().replace(" ", ""))
                .collect(Collectors.toList());
        return candidates.stream().anyMatch(v -> v.getSize() != null
                && normalizedAllowed.contains(v.getSize().toLowerCase().replace(" ", "")));
    }

    private Long firstOrNull(List<Long> ids) {
        return (ids != null && !ids.isEmpty()) ? ids.get(0) : null;
    }
}
