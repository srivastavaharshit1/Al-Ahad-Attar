package com.alahadattars.mapper;

import com.alahadattars.dto.product.ProductRequest;
import com.alahadattars.dto.product.ProductResponse;
import com.alahadattars.dto.product.ProductSummaryResponse;
import com.alahadattars.dto.variant.VariantResponse;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.service.ProductImageResolver;
import com.alahadattars.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class ProductMapper {

    private final CategoryMapper categoryMapper;
    private final ProductVariantMapper productVariantMapper;
    private final StorageService storageService;
    private final ProductImageResolver productImageResolver;
    private final com.alahadattars.service.PromotionEngineService promotionEngineService;

    public ProductResponse toResponse(Product product) {
        return toResponse(product, java.util.Collections.emptyList());
    }

    public ProductResponse toResponse(Product product, java.util.List<com.alahadattars.entity.Promotion> activePromotions) {
        if (product == null) {
            return null;
        }

        List<VariantResponse> variantResponses = null;
        if (product.getVariants() != null) {
            variantResponses = product.getVariants().stream()
                    .filter(ProductVariant::isActive)
                    .map(v -> productVariantMapper.toResponse(v, activePromotions))
                    .collect(Collectors.toList());
        }

        List<com.alahadattars.dto.product.ProductImageResponse> imageResponses = null;
        if (product.getImages() != null) {
            imageResponses = product.getImages().stream()
                    .filter(img -> img.isActive())
                    .sorted(java.util.Comparator.comparing(com.alahadattars.entity.ProductImage::getDisplayOrder)
                            .thenComparing(com.alahadattars.entity.ProductImage::getId))
                    .map(img -> com.alahadattars.dto.product.ProductImageResponse.builder()
                            .id(img.getId())
                            .imageUrl(storageService.resolveUrl(img.getImageUrl(), "/api/images/" + img.getId() + "/file"))
                            .displayOrder(img.getDisplayOrder())
                            .isPrimary(img.isPrimary())
                            .altText(img.getAltText())
                            .width(img.getWidth())
                            .height(img.getHeight())
                            .format(img.getFormat())
                            .build())
                    .collect(Collectors.toList());
        }

        return ProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .slug(product.getSlug())
                .description(product.getDescription())
                .brand(product.getBrand())
                .subcategory(product.getSubcategory())
                .fragranceFamily(product.getFragranceFamily())
                .topNotes(product.getTopNotes())
                .middleNotes(product.getMiddleNotes())
                .baseNotes(product.getBaseNotes())
                .longevity(product.getLongevity())
                .projection(product.getProjection())
                .gender(product.getGender())
                .featured(product.isFeatured())
                .featuredInCollection(product.getCollections() != null && product.getCollections().contains("COLLECTIONS"))
                .active(product.isActive())
                .averageRating(product.getAverageRating())
                .reviewCount(product.getReviewCount())
                .category(categoryMapper.toResponse(product.getCategory()))
                .variants(variantResponses)
                .images(imageResponses)
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }

    public Product toEntity(ProductRequest request) {
        if (request == null) {
            return null;
        }

        return Product.builder()
                .name(request.getName())
                .slug(request.getSlug())
                .shortDescription(request.getShortDescription())
                .description(request.getDescription())
                .brand(request.getBrand())
                .subcategory(request.getSubcategory())
                .fragranceFamily(request.getFragranceFamily())
                .topNotes(request.getTopNotes())
                .middleNotes(request.getMiddleNotes())
                .baseNotes(request.getBaseNotes())
                .longevity(request.getLongevity())
                .projection(request.getProjection())
                .gender(request.getGender())
                .featured(request.isFeatured())
                .collections(request.isFeaturedInCollection() ? new java.util.HashSet<>(java.util.Arrays.asList("COLLECTIONS")) : new java.util.HashSet<>())
                .active(request.isActive())
                .build();
    }

    public ProductSummaryResponse toSummaryResponse(Product product) {
        return toSummaryResponse(product, null, java.util.Collections.emptyList());
    }

    public ProductSummaryResponse toSummaryResponse(Product product, String requestedContextType) {
        return toSummaryResponse(product, requestedContextType, java.util.Collections.emptyList());
    }

    public ProductSummaryResponse toSummaryResponse(Product product, String requestedContextType, java.util.List<com.alahadattars.entity.Promotion> activePromotions) {
        if (product == null) {
            return null;
        }

        String categoryName = product.getCategory() != null ? product.getCategory().getName() : null;
        String categoryType = product.getCategory() != null && product.getCategory().getType() != null ? product.getCategory().getType().name() : null;

        String preferredType = resolvePreferredType(requestedContextType, categoryName);
        List<ProductVariant> preferredVariants = getPreferredVariants(product, preferredType);

        BigDecimal minPrice = resolveMinimumPrice(preferredVariants);

        BigDecimal effectiveMinPrice = minPrice;
        if (minPrice != null && activePromotions != null && !activePromotions.isEmpty()) {
            effectiveMinPrice = promotionEngineService.calculateBestProductPrice(product, minPrice, activePromotions);
        }

        ProductVariant defaultVariant = resolveDefaultVariant(preferredVariants, minPrice);

        Long defaultVariantId = defaultVariant != null ? defaultVariant.getId() : null;
        String defaultVariantSize = defaultVariant != null ? defaultVariant.getSize() : null;
        String defaultVariantType = defaultVariant != null && defaultVariant.getProductType() != null ? defaultVariant.getProductType().name() : null;

        Integer totalStock = preferredVariants.stream()
                .mapToInt(v -> v.getStock() != null ? v.getStock() : 0)
                .sum();

        List<String> availableSizesList = preferredVariants.stream()
                .map(ProductVariant::getSize)
                .collect(Collectors.toList());

        String thumb = productImageResolver.resolveImage(product.getImages(), preferredType);

        return ProductSummaryResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .slug(product.getSlug())
                .brand(product.getBrand())
                .gender(product.getGender())
                .featured(product.isFeatured())
                .featuredInCollection(product.getCollections() != null && product.getCollections().contains("COLLECTIONS"))
                .categoryName(categoryName)
                .categoryType(categoryType)
                .subcategory(product.getSubcategory())
                .minimumPrice(minPrice)
                .effectiveMinimumPrice(effectiveMinPrice)
                .thumbnail(thumb)
                .totalStock(totalStock)
                .defaultVariantId(defaultVariantId)
                .defaultVariantSize(defaultVariantSize)
                .defaultVariantType(defaultVariantType)
                .availableSizes(availableSizesList)
                .averageRating(product.getAverageRating())
                .reviewCount(product.getReviewCount())
                .active(product.isActive())
                .build();
    }

    private String resolvePreferredType(String requestedContextType, String categoryName) {
        if (requestedContextType != null) {
            return requestedContextType;
        }
        if (categoryName != null) {
            if (categoryName.equalsIgnoreCase("Perfumes")) {
                return "PERFUME";
            } else if (categoryName.equalsIgnoreCase("Attars")) {
                return "ATTAR";
            }
        }
        return null;
    }

    private List<ProductVariant> getPreferredVariants(Product product, String preferredType) {
        if (product.getVariants() == null || product.getVariants().isEmpty()) {
            return java.util.Collections.emptyList();
        }
        List<ProductVariant> activeVariants = product.getVariants().stream()
                .filter(ProductVariant::isActive)
                .collect(Collectors.toList());

        if (preferredType != null) {
            List<ProductVariant> filtered = activeVariants.stream()
                    .filter(v -> v.getProductType().name().equalsIgnoreCase(preferredType))
                    .collect(Collectors.toList());
            if (!filtered.isEmpty()) {
                return filtered;
            }
        }
        return activeVariants;
    }

    private BigDecimal resolveMinimumPrice(List<ProductVariant> variants) {
        return variants.stream()
                .map(ProductVariant::getPrice)
                .min(BigDecimal::compareTo)
                .orElse(null);
    }

    private ProductVariant resolveDefaultVariant(List<ProductVariant> variants, BigDecimal minPrice) {
        ProductVariant firstFallback = variants.stream().findFirst().orElse(null);
        return variants.stream()
                .filter(v -> minPrice != null && v.getPrice().compareTo(minPrice) == 0)
                .findFirst()
                .orElse(firstFallback);
    }

}
