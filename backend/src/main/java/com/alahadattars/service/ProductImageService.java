package com.alahadattars.service;

import com.alahadattars.dto.product.ProductImageResponse;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

public interface ProductImageService {
    ProductImageResponse uploadImage(Long productId, MultipartFile file);
    List<ProductImageResponse> getImagesByProduct(Long productId);
    void deleteImage(Long imageId);
    List<ProductImageResponse> updateDisplayOrder(Long productId, List<Long> orderedImageIds);
    ProductImageResponse setPrimaryImage(Long imageId);
    ProductImageResponse updateAltText(Long imageId, String altText);
}
