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
                    .map(productVariantMapper::toResponse)
                    .collect(Collectors.toList());
        }

        List<com.alahadattars.dto.product.ProductImageResponse> imageResponses = null;
        if (product.getImages() != null) {
            imageResponses = product.getImages().stream()
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
        if (product == null) {
            return null;
        }

        BigDecimal minPrice = null;
        String thumb = null;
        Integer totalStock = 0;
        Long defaultVariantId = null;
        String defaultVariantSize = null;

        String categoryName = product.getCategory() != null ? product.getCategory().getName() : null;
        java.util.List<String> availableSizesList = java.util.Collections.emptyList();

        if (product.getVariants() != null && !product.getVariants().isEmpty()) {
            minPrice = product.getVariants().stream()
                    .map(ProductVariant::getPrice)
                    .min(BigDecimal::compareTo)
                    .orElse(null);
            
            defaultVariantId = product.getVariants().get(0).getId();
            defaultVariantSize = product.getVariants().get(0).getSize();
            
            totalStock = product.getVariants().stream()
                    .mapToInt(v -> v.getStock() != null ? v.getStock() : 0)
                    .sum();
                    
            availableSizesList = product.getVariants().stream()
                    .filter(ProductVariant::isActive)
                    .map(ProductVariant::getSize)
                    .collect(Collectors.toList());
        }

        if (product.getImages() != null && !product.getImages().isEmpty()) {
            com.alahadattars.entity.ProductImage thumbImage = product.getImages().stream()
                    .filter(com.alahadattars.entity.ProductImage::isPrimary)
                    .findFirst()
                    .orElse(product.getImages().get(0));
            thumb = storageService.resolveUrl(thumbImage.getImageUrl(), "/api/images/" + thumbImage.getId() + "/file");
        }

        return ProductSummaryResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .slug(product.getSlug())
                .brand(product.getBrand())
                .subcategory(product.getSubcategory())
                .gender(product.getGender())
                .featured(product.isFeatured())
                .featuredInCollection(product.getCollections() != null && product.getCollections().contains("COLLECTIONS"))
                .categoryName(categoryName)
                .minimumPrice(minPrice)
                .thumbnail(thumb)
                .totalStock(totalStock)
                .defaultVariantId(defaultVariantId)
                .defaultVariantSize(defaultVariantSize)
                .availableSizes(availableSizesList)
                .averageRating(product.getAverageRating())
                .reviewCount(product.getReviewCount())
                .build();
    }

}
