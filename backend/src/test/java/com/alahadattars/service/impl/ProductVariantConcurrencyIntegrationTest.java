package com.alahadattars.service.impl;

import com.alahadattars.controller.ProductVariantController;
import com.alahadattars.dto.product.ProductRequest;
import com.alahadattars.dto.product.ProductResponse;
import com.alahadattars.dto.variant.CreateVariantRequest;
import com.alahadattars.dto.variant.VariantResponse;
import com.alahadattars.entity.Category;
import com.alahadattars.entity.Product;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.ProductRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.response.ApiResponse;
import com.alahadattars.service.ProductService;
import com.alahadattars.service.ProductVariantService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

@SpringBootTest
@ActiveProfiles("test") // Use H2 test profile if available
public class ProductVariantConcurrencyIntegrationTest {

    @Autowired
    private ProductVariantController productVariantController;

    @Autowired
    private ProductVariantRepository variantRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    private Long testProductId;

    @BeforeEach
    public void setup() {
        Category category = new Category();
        category.setName("Variant Concurrency Category");
        category.setDescription("Test Category Description");
        category.setImage("test-image.jpg");
        category.setType(com.alahadattars.enums.CategoryType.PERFUMES);
        category = categoryRepository.save(category);

        Product product = new Product();
        product.setName("Concurrent Test Product");
        product.setSlug("concurrent-test-product");
        product.setDescription("Test desc");
        product.setShortDescription("Short desc");
        product.setBrand("Test Brand");
        product.setCategory(category);
        product.setTopNotes("Top Notes");
        product.setMiddleNotes("Middle Notes");
        product.setBaseNotes("Base Notes");
        product.setFragranceFamily("Woody");
        product.setLongevity("Long lasting");
        product.setProjection("Strong");
        product.setGender(com.alahadattars.enums.Gender.UNISEX);
        product.setActive(true);
        product = productRepository.save(product);

        testProductId = product.getId();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    public void testConcurrentSkuCreation() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(3);
        List<Callable<ResponseEntity<ApiResponse<VariantResponse>>>> tasks = new ArrayList<>();
        SecurityContext context = SecurityContextHolder.getContext();

        // We simulate 3 concurrent requests trying to create a variant with the exact same base SKU
        for (int i = 0; i < 3; i++) {
            tasks.add(() -> {
                SecurityContextHolder.setContext(context);
                try {
                    CreateVariantRequest request = new CreateVariantRequest();
                    request.setSku("car-perfume-b");
                    request.setSize("Standard");
                    request.setPrice(BigDecimal.valueOf(299));
                    request.setStock(10);
                    request.setActive(true);
                    request.setProductType(com.alahadattars.enums.ProductType.PERFUME);
                    return productVariantController.createVariant(testProductId, request);
                } finally {
                    SecurityContextHolder.clearContext();
                }
            });
        }

        List<Future<ResponseEntity<ApiResponse<VariantResponse>>>> futures = executor.invokeAll(tasks);
        
        List<String> assignedSkus = new ArrayList<>();
        
        for (Future<ResponseEntity<ApiResponse<VariantResponse>>> future : futures) {
            ResponseEntity<ApiResponse<VariantResponse>> responseEntity = future.get(); // this will throw if an unhandled exception occurred
            ApiResponse<VariantResponse> response = responseEntity.getBody();
            assertThat(response.isSuccess()).isTrue();
            assignedSkus.add(response.getData().getSku());
        }

        // Verify that all 3 tasks got a unique SKU!
        assertThat(assignedSkus).hasSize(3);
        assertThat(assignedSkus.get(0)).isNotEqualTo(assignedSkus.get(1));
        assertThat(assignedSkus.get(1)).isNotEqualTo(assignedSkus.get(2));
        assertThat(assignedSkus.get(0)).isNotEqualTo(assignedSkus.get(2));

        // Verify database actually has 3 variants
        long count = variantRepository.count();
        assertTrue(count >= 3);
        
        executor.shutdown();
    }
}
