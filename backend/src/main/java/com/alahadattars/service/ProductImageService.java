package com.alahadattars.service;

import com.alahadattars.dto.product.ProductImageResponse;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

public interface ProductImageService {
    /** Upload an image for a product (generic — productType stored as altText, may be null). */
    ProductImageResponse uploadImage(Long productId, MultipartFile file);

    /**
     * Upload an image for a product with an explicit type tag.
     * @param productType "ATTAR", "PERFUME", or null / "" for a shared image.
     */
    ProductImageResponse uploadImage(Long productId, MultipartFile file, String productType);

    List<ProductImageResponse> getImagesByProduct(Long productId);

    /**
     * Return only images matching the given productType tag ("ATTAR" / "PERFUME").
     * If productType is null or blank, returns all images.
     */
    List<ProductImageResponse> getImagesByProductAndType(Long productId, String productType);

    void deleteImage(Long imageId);
    List<ProductImageResponse> updateDisplayOrder(Long productId, List<Long> orderedImageIds);
    ProductImageResponse setPrimaryImage(Long imageId);
    ProductImageResponse updateAltText(Long imageId, String altText);
}
