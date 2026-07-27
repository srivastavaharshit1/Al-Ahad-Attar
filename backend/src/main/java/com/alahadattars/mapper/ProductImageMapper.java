package com.alahadattars.mapper;

import com.alahadattars.dto.product.ProductImageResponse;
import com.alahadattars.entity.ProductImage;
import org.springframework.stereotype.Component;

@Component
public class ProductImageMapper {

    public ProductImageResponse toResponse(ProductImage image) {
        if (image == null) {
            return null;
        }

        return ProductImageResponse.builder()
                .id(image.getId())
                .imageUrl(image.getImageUrl() != null ? "/api/images/" + image.getId() + "/file" : null)
                .displayOrder(image.getDisplayOrder())
                .isPrimary(image.isPrimary())
                .altText(image.getAltText())
                .width(image.getWidth())
                .height(image.getHeight())
                .format(image.getFormat())
                .build();
    }
}
