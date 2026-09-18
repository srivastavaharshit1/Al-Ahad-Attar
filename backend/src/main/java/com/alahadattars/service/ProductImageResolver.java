package com.alahadattars.service;

import com.alahadattars.entity.ProductImage;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class ProductImageResolver {

    private final StorageService storageService;

    public String resolveImage(List<ProductImage> images, String preferredType) {
        if (images == null || images.isEmpty()) {
            return null;
        }

        List<ProductImage> activeImages = images.stream()
                .filter(ProductImage::isActive)
                .collect(Collectors.toList());

        Comparator<ProductImage> imageComparator =
            Comparator.comparing(ProductImage::getDisplayOrder)
                .thenComparing(ProductImage::getId);

        ProductImage thumbImage = (preferredType != null && !preferredType.trim().isEmpty())
                ? resolveContextualImage(activeImages, preferredType, imageComparator)
                : resolveDefaultImage(activeImages, imageComparator);

        if (thumbImage != null) {
            return storageService.resolveUrl(thumbImage.getImageUrl(), "/api/images/" + thumbImage.getId() + "/file");
        }
        return null;
    }

    private ProductImage resolveContextualImage(List<ProductImage> activeImages, String preferredType, Comparator<ProductImage> comparator) {
        return activeImages.stream()
                .filter(img -> preferredType.equalsIgnoreCase(img.getAltText()) && img.isPrimary())
                .min(comparator)
                .orElseGet(() -> activeImages.stream()
                        .filter(img -> preferredType.equalsIgnoreCase(img.getAltText()))
                        .min(comparator)
                        .orElseGet(() -> resolveSharedImage(activeImages, comparator)));
    }

    private ProductImage resolveSharedImage(List<ProductImage> activeImages, Comparator<ProductImage> comparator) {
        return activeImages.stream()
                .filter(img -> (img.getAltText() == null || img.getAltText().trim().isEmpty()) && img.isPrimary())
                .min(comparator)
                .orElseGet(() -> activeImages.stream()
                        .filter(img -> img.getAltText() == null || img.getAltText().trim().isEmpty())
                        .min(comparator)
                        .orElse(null));
    }

    private ProductImage resolveDefaultImage(List<ProductImage> activeImages, Comparator<ProductImage> comparator) {
        return activeImages.stream()
                .filter(ProductImage::isPrimary)
                .min(comparator)
                .orElseGet(() -> activeImages.stream().min(comparator).orElse(null));
    }
}
