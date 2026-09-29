package com.alahadattars.service.impl;

import com.alahadattars.controller.ProductController;
import com.alahadattars.dto.product.ProductRequest;
import com.alahadattars.dto.product.ProductResponse;
import com.alahadattars.entity.Category;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.ProductRepository;
import com.alahadattars.response.ApiResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.Set;
import java.util.HashSet;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
public class ProductSlugConcurrencyIntegrationTest {

    @Autowired
    private ProductController productController;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    private Long testCategoryId;

    @BeforeEach
    public void setup() {
        Category category = new Category();
        category.setName("Test Category " + System.currentTimeMillis());
        category.setDescription("Test category description");
        category.setImage("test-image.jpg");
        category.setType(com.alahadattars.enums.CategoryType.ATTARS);
        category.setActive(true);
        category = categoryRepository.save(category);
        testCategoryId = category.getId();
    }

    @AfterEach
    public void cleanup() {
        // Removed global deleteAll() as it breaks other tests' seeded data (e.g. OrderItem -> ProductVariant)
    }

    private ProductRequest createRequest(String name, String customSlug) {
        ProductRequest request = new ProductRequest();
        request.setName(name);
        request.setSlug(customSlug);
        request.setDescription("Test desc");
        request.setShortDescription("Short desc");
        request.setBrand("Test Brand");
        request.setCategoryId(testCategoryId);
        request.setTopNotes("Top");
        request.setMiddleNotes("Middle");
        request.setBaseNotes("Base");
        request.setFragranceFamily("Woody");
        request.setLongevity("Long");
        request.setProjection("Strong");
        request.setGender(com.alahadattars.enums.Gender.UNISEX);
        request.setActive(true);
        return request;
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    public void testSequentialSlugGeneration() {
        long timestamp = System.currentTimeMillis();
        String name = "Seq Perfume " + timestamp;
        String baseSlug = "seq-perfume-" + timestamp;

        // 1. First product name -> baseSlug
        ProductRequest r1 = createRequest(name, null);
        ProductResponse p1 = productController.createProduct(r1).getBody().getData();
        assertThat(p1.getSlug()).isEqualTo(baseSlug);

        // 2. Second product with same name -> baseSlug-2
        ProductRequest r2 = createRequest(name, null);
        ProductResponse p2 = productController.createProduct(r2).getBody().getData();
        assertThat(p2.getSlug()).isEqualTo(baseSlug + "-2");

        // 3. Third product -> baseSlug-3
        ProductRequest r3 = createRequest(name, null);
        ProductResponse p3 = productController.createProduct(r3).getBody().getData();
        assertThat(p3.getSlug()).isEqualTo(baseSlug + "-3");
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    public void testConcurrentSlugCreation() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(4);
        List<Callable<ResponseEntity<ApiResponse<ProductResponse>>>> tasks = new ArrayList<>();
        SecurityContext context = SecurityContextHolder.getContext();
        
        long timestamp = System.currentTimeMillis();
        String name = "Concurrent Perfume " + timestamp;
        String baseSlug = "concurrent-perfume-" + timestamp;

        for (int i = 0; i < 4; i++) {
            tasks.add(() -> {
                SecurityContextHolder.setContext(context);
                try {
                    ProductRequest req = createRequest(name, "");
                    return productController.createProduct(req);
                } finally {
                    SecurityContextHolder.clearContext();
                }
            });
        }

        List<Future<ResponseEntity<ApiResponse<ProductResponse>>>> results = executor.invokeAll(tasks);
        
        Set<String> generatedSlugs = new HashSet<>();
        for (Future<ResponseEntity<ApiResponse<ProductResponse>>> result : results) {
            ProductResponse pr = result.get().getBody().getData();
            generatedSlugs.add(pr.getSlug());
        }

        assertThat(generatedSlugs).hasSize(4);
        assertThat(generatedSlugs).contains(baseSlug, baseSlug + "-2", baseSlug + "-3", baseSlug + "-4");
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    public void testDuplicateCustomSlugReturns409AndSpecificMessage() {
        String customSlug = "my-custom-slug-" + System.currentTimeMillis();
        ProductRequest r1 = createRequest("First Product", customSlug);
        productController.createProduct(r1);

        ProductRequest r2 = createRequest("Second Product", customSlug);
        
        try {
            productController.createProduct(r2);
            org.junit.jupiter.api.Assertions.fail("Should have thrown ConflictException");
        } catch (com.alahadattars.exception.ConflictException ex) {
            assertThat(ex.getMessage()).isEqualTo("This URL is already in use. Please choose another one.");
            assertThat(ex.getCode()).isEqualTo("DUPLICATE_SLUG");
        }
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    public void testUnrelatedConstraintViolationDoesNotTriggerRetry() {
        ProductRequest r1 = createRequest("Bad Product", null);
        // deliberately violate a non-null constraint that isn't slug related
        r1.setBrand(null); // brand is nullable=false in DB

        try {
            productController.createProduct(r1);
            org.junit.jupiter.api.Assertions.fail("Should have thrown DataIntegrityViolationException");
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            // It should throw DataIntegrityViolationException directly,
            // NOT ConflictException from the retry loop!
            assertThat(ex).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        }
    }
}
