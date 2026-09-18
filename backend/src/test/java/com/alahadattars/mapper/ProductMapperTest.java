package com.alahadattars.mapper;

import com.alahadattars.dto.product.ProductSummaryResponse;
import com.alahadattars.entity.Category;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductImage;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.enums.CategoryType;
import com.alahadattars.enums.ProductType;
import com.alahadattars.service.ProductImageResolver;
import com.alahadattars.service.StorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductMapperTest {

    @Mock
    private CategoryMapper categoryMapper;

    @Mock
    private ProductVariantMapper productVariantMapper;

    @Mock
    private StorageService storageService;

    @Mock
    private ProductImageResolver productImageResolver;

    @InjectMocks
    private ProductMapper productMapper;

    @BeforeEach
    void setUp() {
    }

    private void mockProductImageResolver() {
        when(productImageResolver.resolveImage(any(), any())).thenAnswer(invocation -> {
            List<ProductImage> images = invocation.getArgument(0);
            String preferredType = invocation.getArgument(1);
            if (images == null || images.isEmpty()) return null;
            if (preferredType != null) {
                for (ProductImage img : images) {
                    if (preferredType.equalsIgnoreCase(img.getAltText())) return "url-" + img.getId();
                }
            }
            return "url-" + images.get(0).getId();
        });
    }

    private Product createProduct(String categoryName) {
        Category category = null;
        if (categoryName != null) {
            category = Category.builder().name(categoryName).type(CategoryType.PERFUMES).build();
        }
        Product p = Product.builder()
                .name("Test Product")
                .category(category)
                .variants(new ArrayList<>())
                .images(new ArrayList<>())
                .build();
        p.setId(1L);
        return p;
    }

    private ProductVariant createVariant(Long id, ProductType type, String size, BigDecimal price, Integer stock) {
        ProductVariant pv = ProductVariant.builder()
                .productType(type)
                .size(size)
                .price(price)
                .stock(stock)
                .active(true)
                .build();
        pv.setId(id);
        return pv;
    }

    private ProductImage createImage(Long id, String altText, boolean isPrimary, Integer displayOrder) {
        ProductImage pi = ProductImage.builder()
                .altText(altText)
                .isPrimary(isPrimary)
                .displayOrder(displayOrder)
                .imageUrl("url-" + id)
                .active(true)
                .build();
        pi.setId(id);
        return pi;
    }

    @Test
    @DisplayName("A. Attar-only product")
    void testAttarOnlyProduct() {
        mockProductImageResolver();
        Product product = createProduct("Attars");
        product.getVariants().add(createVariant(10L, ProductType.ATTAR, "10ml", new BigDecimal("50.00"), 10));
        product.getVariants().add(createVariant(11L, ProductType.ATTAR, "50ml", new BigDecimal("200.00"), 5));

        product.getImages().add(createImage(100L, "ATTAR", true, 1));
        product.getImages().add(createImage(101L, "PERFUME", true, 0)); // Should be ignored because category is Attars

        ProductSummaryResponse response = productMapper.toSummaryResponse(product);

        assertNotNull(response);
        assertEquals(new BigDecimal("50.00"), response.getMinimumPrice());
        assertEquals(10L, response.getDefaultVariantId());
        assertEquals("10ml", response.getDefaultVariantSize());
        assertEquals("ATTAR", response.getDefaultVariantType());
        assertEquals(15, response.getTotalStock());
        assertEquals("url-100", response.getThumbnail());
    }

    @Test
    @DisplayName("B. Perfume-only product")
    void testPerfumeOnlyProduct() {
        mockProductImageResolver();
        Product product = createProduct("Perfumes");
        product.getVariants().add(createVariant(20L, ProductType.PERFUME, "50ml", new BigDecimal("100.00"), 10));

        product.getImages().add(createImage(200L, "PERFUME", true, 1));
        product.getImages().add(createImage(201L, "ATTAR", true, 0)); // Ignored

        ProductSummaryResponse response = productMapper.toSummaryResponse(product);

        assertNotNull(response);
        assertEquals(new BigDecimal("100.00"), response.getMinimumPrice());
        assertEquals(20L, response.getDefaultVariantId());
        assertEquals("50ml", response.getDefaultVariantSize());
        assertEquals("PERFUME", response.getDefaultVariantType());
        assertEquals(10, response.getTotalStock());
        assertEquals("url-200", response.getThumbnail());
    }

    @Test
    @DisplayName("C. Product containing both Attar and Perfume variants - Explicit Context")
    void testMixedProductWithContext() {
        mockProductImageResolver();
        Product product = createProduct("Unisex"); // No implicit category type preference
        product.getVariants().add(createVariant(30L, ProductType.ATTAR, "10ml", new BigDecimal("30.00"), 10));
        product.getVariants().add(createVariant(31L, ProductType.PERFUME, "50ml", new BigDecimal("100.00"), 5));

        product.getImages().add(createImage(300L, "ATTAR", true, 0));
        product.getImages().add(createImage(301L, "PERFUME", true, 0));

        // Request PERFUME context
        ProductSummaryResponse responsePerfume = productMapper.toSummaryResponse(product, "PERFUME");
        assertEquals(new BigDecimal("100.00"), responsePerfume.getMinimumPrice());
        assertEquals(31L, responsePerfume.getDefaultVariantId());
        assertEquals("PERFUME", responsePerfume.getDefaultVariantType());
        assertEquals(5, responsePerfume.getTotalStock());
        assertEquals("url-301", responsePerfume.getThumbnail());

        // Request ATTAR context
        ProductSummaryResponse responseAttar = productMapper.toSummaryResponse(product, "ATTAR");
        assertEquals(new BigDecimal("30.00"), responseAttar.getMinimumPrice());
        assertEquals(30L, responseAttar.getDefaultVariantId());
        assertEquals("ATTAR", responseAttar.getDefaultVariantType());
        assertEquals(10, responseAttar.getTotalStock());
        assertEquals("url-300", responseAttar.getThumbnail());
    }

    @Test
    @DisplayName("I. Product with no images")
    void testNoImages() {
        mockProductImageResolver();
        Product product = createProduct("Perfumes");
        // Empty images list

        ProductSummaryResponse response = productMapper.toSummaryResponse(product);
        assertNull(response.getThumbnail());
    }

    @Test
    @DisplayName("J. Product with multiple variants (Default Variant Logic)")
    void testMultipleVariantsDefaultLogic() {
        Product product = createProduct(null);
        product.getVariants().add(createVariant(90L, ProductType.ATTAR, "10ml", new BigDecimal("100.00"), 5));
        product.getVariants().add(createVariant(91L, ProductType.PERFUME, "50ml", new BigDecimal("50.00"), 10)); // Min price
        product.getVariants().add(createVariant(92L, ProductType.PERFUME, "100ml", new BigDecimal("150.00"), 15));

        // Inactive variant that has a lower price should be ignored
        ProductVariant inactive = createVariant(93L, ProductType.PERFUME, "5ml", new BigDecimal("10.00"), 100);
        inactive.setActive(false);
        product.getVariants().add(inactive);

        ProductSummaryResponse response = productMapper.toSummaryResponse(product);

        assertEquals(new BigDecimal("50.00"), response.getMinimumPrice());
        assertEquals(91L, response.getDefaultVariantId()); // Matches min price
        assertEquals(30, response.getTotalStock()); // Only active variants summed
        assertEquals(Arrays.asList("10ml", "50ml", "100ml"), response.getAvailableSizes());
    }

    @Test
    @DisplayName("Fallback Null/Empty Safe")
    void testNullSafeties() {
        // Test completely null product
        assertNull(productMapper.toSummaryResponse(null));

        // Test product with everything null
        Product emptyProduct = new Product();
        ProductSummaryResponse response = productMapper.toSummaryResponse(emptyProduct);
        assertNotNull(response);
        assertNull(response.getMinimumPrice());
        assertNull(response.getThumbnail());
        assertEquals(0, response.getTotalStock());
        assertTrue(response.getAvailableSizes().isEmpty());
    }
}
