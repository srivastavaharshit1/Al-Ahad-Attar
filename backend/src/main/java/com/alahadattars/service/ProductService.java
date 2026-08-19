package com.alahadattars.service;

import com.alahadattars.dto.product.ProductRequest;
import com.alahadattars.dto.product.ProductResponse;
import com.alahadattars.dto.product.ProductSummaryResponse;

import com.alahadattars.enums.Gender;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ProductService {
    ProductResponse createProduct(ProductRequest request);
    ProductResponse updateProduct(Long id, ProductRequest request);
    void deleteProduct(Long id);
    ProductResponse getProductById(Long id);
    ProductResponse getProductBySlug(String slug);
    List<ProductSummaryResponse> getFeaturedProducts();
    List<ProductSummaryResponse> getProductsByCategory(Long categoryId);
    List<ProductSummaryResponse> getActiveProducts();
    Page<ProductSummaryResponse> getProducts(String search, Long categoryId, String subcategory, Gender gender, String brand, Boolean featured, Boolean active, Boolean featuredInCollection, String type, Pageable pageable);
    void activateProduct(Long id);
    void deactivateProduct(Long id);
    List<ProductSummaryResponse> getRelatedProducts(Long id);
}
