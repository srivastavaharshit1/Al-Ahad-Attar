package com.alahadattars.mapper;

import com.alahadattars.dto.product.ProductImageResponse;
import com.alahadattars.entity.ProductImage;
import com.alahadattars.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ProductImageMapper {

    private final StorageService storageService;

    public ProductImageResponse toResponse(ProductImage image) {
        if (image == null) {
            return null;
        }

        return ProductImageResponse.builder()
                .id(image.getId())
                .imageUrl(storageService.resolveUrl(image.getImageUrl(), "/api/images/" + image.getId() + "/file"))
                .displayOrder(image.getDisplayOrder())
                .isPrimary(image.isPrimary())
                .altText(image.getAltText())
                .width(image.getWidth())
                .height(image.getHeight())
                .format(image.getFormat())
                .build();
    }
}
