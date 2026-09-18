package com.alahadattars.controller;

import com.alahadattars.dto.product.ProductResponse;
import com.alahadattars.service.ProductService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.cache.CacheManager;
import org.springframework.test.context.ActiveProfiles;

import static org.mockito.Mockito.*;

@SpringBootTest
@ActiveProfiles("test")
public class ProductControllerCacheTest {

    @Autowired
    private ProductController productController;

    @MockBean
    private ProductService productService;

    @Autowired
    private CacheManager cacheManager;

    @BeforeEach
    void setUp() {
        if (cacheManager.getCache("products") != null) {
            cacheManager.getCache("products").clear();
        }
    }

    @Test
    void testGetProductBySlug_CacheMissThenHit() {
        String slug = "test-slug";
        ProductResponse mockResponse = new ProductResponse();
        when(productService.getProductBySlug(slug)).thenReturn(mockResponse);

        // First call - cache miss
        productController.getProductBySlug(slug);
        verify(productService, times(1)).getProductBySlug(slug);

        // Second call - cache hit
        productController.getProductBySlug(slug);
        verify(productService, times(1)).getProductBySlug(slug); // Still 1

        // Clear cache (simulate eviction)
        cacheManager.getCache("products").clear();

        // Third call - cache miss again
        productController.getProductBySlug(slug);
        verify(productService, times(2)).getProductBySlug(slug);
    }
}
