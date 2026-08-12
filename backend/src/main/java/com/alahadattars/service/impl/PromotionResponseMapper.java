package com.alahadattars.service.impl;

import com.alahadattars.dto.promotion.PromotionResponse;
import com.alahadattars.entity.Category;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.Promotion;
import com.alahadattars.entity.PromotionConfiguration;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.ProductRepository;
import com.alahadattars.util.PromotionDescriptionGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Decorates the existing static PromotionResponse.fromEntity/toPublicView factories with a
 * generated human-readable description — kept as a decorator (not a rewrite of those factories)
 * so callers that don't need the description can keep using the static methods directly. Name
 * lookups are simple findById calls, not batched/cached — acceptable at the current small,
 * admin-curated promotion-table scale (see PROJECT_REPORT.md).
 */
@Component
@RequiredArgsConstructor
public class PromotionResponseMapper {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    public PromotionResponse toResponse(Promotion promo) {
        PromotionResponse response = PromotionResponse.fromEntity(promo);
        if (response != null) response.setGeneratedDescription(buildDescription(promo));
        return response;
    }

    public PromotionResponse toPublicResponse(Promotion promo) {
        PromotionResponse response = PromotionResponse.toPublicView(promo);
        if (response != null) response.setGeneratedDescription(buildDescription(promo));
        return response;
    }

    private String buildDescription(Promotion promo) {
        if (promo == null) return null;
        PromotionConfiguration config = promo.getConfiguration();
        if (config == null) return null;

        try {
            String buyCategoryName = categoryName(config.getBuyCategoryId());
            String buyProductName = productName(config.getBuyProductId());
            Long freeCategoryId = firstOrNull(config.getFreeCategoryIds());
            String freeCategoryName = categoryName(freeCategoryId != null ? freeCategoryId : config.getBuyCategoryId());
            String freeProductName = productName(firstOrNull(config.getFreeProductIds()));

            return PromotionDescriptionGenerator.generate(
                    promo.getPromotionType(), config, buyCategoryName, buyProductName, freeCategoryName, freeProductName);
        } catch (Exception e) {
            // Never let a stale category/product reference (deleted after the promotion was
            // created) break the response — just fall back to no generated description.
            return null;
        }
    }

    private String categoryName(Long id) {
        if (id == null) return null;
        return categoryRepository.findById(id).map(Category::getName).orElse(null);
    }

    private String productName(Long id) {
        if (id == null) return null;
        return productRepository.findById(id).map(Product::getName).orElse(null);
    }

    private Long firstOrNull(List<Long> ids) {
        return (ids != null && !ids.isEmpty()) ? ids.get(0) : null;
    }
}
