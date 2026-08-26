package com.alahadattars.mapper;

import com.alahadattars.dto.product.ProductRequest;
import com.alahadattars.dto.product.ProductResponse;
import com.alahadattars.dto.product.ProductSummaryResponse;
import com.alahadattars.dto.variant.VariantResponse;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
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

    public ProductResponse toResponse(Product product) {
        if (product == null) {
            return null;
        }

        List<VariantResponse> variantResponses = null;
        if (product.getVariants() != null) {
            variantResponses = product.getVariants().stream()
                    .filter(ProductVariant::isActive)
                    .map(productVariantMapper::toResponse)
                    .collect(Collectors.toList());
        }

        List<com.alahadattars.dto.product.ProductImageResponse> imageResponses = null;
        if (product.getImages() != null) {
            imageResponses = product.getImages().stream()
                    .filter(img -> img.isActive())
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
        return toSummaryResponse(product, null);
    }

    public ProductSummaryResponse toSummaryResponse(Product product, String requestedContextType) {
        if (product == null) {
            return null;
        }

        BigDecimal minPrice = null;
        String thumb = null;
        Integer totalStock = 0;
        Long defaultVariantId = null;
        String defaultVariantSize = null;
        String defaultVariantType = null;

        String categoryName = product.getCategory() != null ? product.getCategory().getName() : null;
        String categoryType = product.getCategory() != null && product.getCategory().getType() != null ? product.getCategory().getType().name() : null;
        java.util.List<String> availableSizesList = java.util.Collections.emptyList();

        if (product.getVariants() != null && !product.getVariants().isEmpty()) {
            java.util.List<ProductVariant> activeVariants = product.getVariants().stream()
                    .filter(ProductVariant::isActive)
                    .collect(Collectors.toList());

            java.util.List<ProductVariant> preferredVariants = activeVariants;
            
            // Determine preferred type based on context or product category
            String preferredType = requestedContextType;
            if (preferredType == null && categoryName != null) {
                if (categoryName.equalsIgnoreCase("Perfumes")) {
                    preferredType = "PERFUME";
                } else if (categoryName.equalsIgnoreCase("Attars")) {
                    preferredType = "ATTAR";
                }
            }

            if (preferredType != null) {
                final String finalPreferredType = preferredType;
                java.util.List<ProductVariant> filtered = activeVariants.stream()
                        .filter(v -> v.getProductType().name().equalsIgnoreCase(finalPreferredType))
                        .collect(Collectors.toList());
                if (!filtered.isEmpty()) {
                    preferredVariants = filtered;
                }
            }

            minPrice = preferredVariants.stream()
                    .map(ProductVariant::getPrice)
                    .min(BigDecimal::compareTo)
                    .orElse(null);
            
            final BigDecimal finalMinPrice = minPrice;
            ProductVariant firstFallback = preferredVariants.stream().findFirst().orElse(null);
            ProductVariant defaultVariant = preferredVariants.stream()
                    .filter(v -> finalMinPrice != null && v.getPrice().compareTo(finalMinPrice) == 0)
                    .findFirst()
                    .orElse(firstFallback);
                    
            if (defaultVariant != null) {
                defaultVariantId = defaultVariant.getId();
                defaultVariantSize = defaultVariant.getSize();
                defaultVariantType = defaultVariant.getProductType() != null ? defaultVariant.getProductType().name() : null;
            }
            
            totalStock = preferredVariants.stream()
                    .mapToInt(v -> v.getStock() != null ? v.getStock() : 0)
                    .sum();
                    
            availableSizesList = preferredVariants.stream()
                    .map(ProductVariant::getSize)
                    .collect(Collectors.toList());
        }

        if (product.getImages() != null && !product.getImages().isEmpty()) {
            com.alahadattars.entity.ProductImage thumbImage = product.getImages().stream()
                    .filter(img -> img.isActive() && img.isPrimary())
                    .findFirst()
                    .orElseGet(() -> product.getImages().stream()
                            .filter(com.alahadattars.entity.ProductImage::isActive)
                            .findFirst()
                            .orElse(null));
            if (thumbImage != null) {
                thumb = storageService.resolveUrl(thumbImage.getImageUrl(), "/api/images/" + thumbImage.getId() + "/file");
            }
        }

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

}
