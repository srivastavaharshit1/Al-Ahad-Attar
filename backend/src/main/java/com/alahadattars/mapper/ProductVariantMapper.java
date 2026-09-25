package com.alahadattars.mapper;

import com.alahadattars.dto.variant.CreateVariantRequest;
import com.alahadattars.dto.variant.VariantResponse;
import com.alahadattars.dto.variant.VariantSummaryResponse;
import com.alahadattars.entity.ProductVariant;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class ProductVariantMapper {

    private final ProductImageMapper productImageMapper;

    public VariantResponse toResponse(ProductVariant variant) {
        if (variant == null) {
            return null;
        }

        return VariantResponse.builder()
                .id(variant.getId())
                .productType(variant.getProductType())
                .size(variant.getSize())
                .price(variant.getPrice())
                .discountedPrice(variant.getDiscountedPrice())
                .stock(variant.getStock())
                .sku(variant.getSku())
                .active(variant.isActive())
                .productId(variant.getProduct() != null ? variant.getProduct().getId() : null)
                .productName(variant.getProduct() != null ? variant.getProduct().getName() : null)
                .productImages(variant.getProduct() != null && variant.getProduct().getImages() != null ?
                        variant.getProduct().getImages().stream()
                                .map(productImageMapper::toResponse)
                                .collect(Collectors.toList()) : null)
                .build();
    }
    
    public VariantSummaryResponse toSummaryResponse(ProductVariant variant) {
        if (variant == null) {
            return null;
        }
        
        return VariantSummaryResponse.builder()
                .id(variant.getId())
                .size(variant.getSize())
                .price(variant.getPrice())
                .inStock(variant.getStock() != null && variant.getStock() > 0)
                .build();
    }

    public ProductVariant toEntity(CreateVariantRequest request) {
        if (request == null) {
            return null;
        }

        java.math.BigDecimal discountedPrice = request.getDiscountedPrice() != null ? request.getDiscountedPrice() : request.getPrice();
        return ProductVariant.builder()
                .productType(request.getProductType() != null ? request.getProductType() : com.alahadattars.enums.ProductType.ATTAR)
                .size(request.getSize())
                .price(request.getPrice())
                .discountedPrice(discountedPrice)
                .stock(request.getStock())
                .sku(request.getSku())
                .active(request.isActive())
                .build();
    }
}
