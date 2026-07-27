package com.alahadattars.mapper;

import com.alahadattars.dto.variant.CreateVariantRequest;
import com.alahadattars.dto.variant.VariantResponse;
import com.alahadattars.dto.variant.VariantSummaryResponse;
import com.alahadattars.entity.ProductVariant;
import org.springframework.stereotype.Component;

@Component
public class ProductVariantMapper {

    public VariantResponse toResponse(ProductVariant variant) {
        if (variant == null) {
            return null;
        }

        return VariantResponse.builder()
                .id(variant.getId())
                .productType(variant.getProductType())
                .size(variant.getSize())
                .price(variant.getPrice())
                .stock(variant.getStock())
                .sku(variant.getSku())
                .image(variant.getImage())
                .active(variant.isActive())
                .productId(variant.getProduct() != null ? variant.getProduct().getId() : null)
                .productName(variant.getProduct() != null ? variant.getProduct().getName() : null)
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

        return ProductVariant.builder()
                .productType(request.getProductType() != null ? request.getProductType() : com.alahadattars.enums.ProductType.ATTAR)
                .size(request.getSize())
                .price(request.getPrice())
                .stock(request.getStock())
                .sku(request.getSku())
                .image(request.getImage() != null ? request.getImage() : "")
                .active(request.isActive())
                .build();
    }
}
