package com.alahadattars.service;

import com.alahadattars.entity.ProductImage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductImageResolverTest {

    @Mock
    private StorageService storageService;

    @InjectMocks
    private ProductImageResolver productImageResolver;

    private void mockStorageService() {
        when(storageService.resolveUrl(anyString(), anyString())).thenAnswer(invocation -> {
            String url = invocation.getArgument(0);
            String fallback = invocation.getArgument(1);
            if (url != null && !url.trim().isEmpty()) {
                return url;
            }
            return fallback;
        });
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
        mockStorageService();
        List<ProductImage> images = new ArrayList<>();
        images.add(createImage(100L, "ATTAR", true, 0));
        images.add(createImage(101L, "PERFUME", true, 1)); // Ignored

        String response = productImageResolver.resolveImage(images, "ATTAR");

        assertEquals("url-100", response);
    }

    @Test
    @DisplayName("B. Perfume-only product")
    void testPerfumeOnlyProduct() {
        mockStorageService();
        List<ProductImage> images = new ArrayList<>();
        images.add(createImage(200L, "PERFUME", true, 1));
        images.add(createImage(201L, "ATTAR", true, 0)); // Ignored

        String response = productImageResolver.resolveImage(images, "PERFUME");

        assertEquals("url-200", response);
    }

    @Test
    @DisplayName("C. Product containing both Attar and Perfume variants - Explicit Context")
    void testMixedProductWithContext() {
        mockStorageService();
        List<ProductImage> images = new ArrayList<>();
        images.add(createImage(300L, "ATTAR", true, 0));
        images.add(createImage(301L, "PERFUME", true, 0));

        // Request PERFUME context
        String responsePerfume = productImageResolver.resolveImage(images, "PERFUME");
        assertEquals("url-301", responsePerfume);

        // Request ATTAR context
        String responseAttar = productImageResolver.resolveImage(images, "ATTAR");
        assertEquals("url-300", responseAttar);
    }

    @Test
    @DisplayName("D. Product with shared images (fallback)")
    void testSharedImageFallback() {
        mockStorageService();
        List<ProductImage> images = new ArrayList<>();
        // Only shared images (no altText)
        images.add(createImage(400L, null, false, 2));
        images.add(createImage(401L, "", true, 1)); // Shared primary

        String response = productImageResolver.resolveImage(images, "ATTAR"); // Request ATTAR context
        assertEquals("url-401", response); // Resolves to shared primary (fallback 3)
    }

    @Test
    @DisplayName("E. Product with type-specific primary images vs non-primary")
    void testTypeSpecificPrimaryPreference() {
        mockStorageService();
        List<ProductImage> images = new ArrayList<>();

        // Type-specific non-primary vs Type-specific primary
        images.add(createImage(500L, "PERFUME", false, 0));
        images.add(createImage(501L, "PERFUME", true, 1)); // Higher displayOrder but isPrimary

        String response = productImageResolver.resolveImage(images, "PERFUME");
        assertEquals("url-501", response); // Resolves to type-specific primary (fallback 1)
    }

    @Test
    @DisplayName("F. Product without a primary image")
    void testWithoutPrimaryImage() {
        mockStorageService();
        List<ProductImage> images = new ArrayList<>();

        // No primary flags at all
        images.add(createImage(600L, "PERFUME", false, 5));
        images.add(createImage(601L, "PERFUME", false, 2)); // Should pick this due to lower displayOrder

        String response = productImageResolver.resolveImage(images, "PERFUME");
        assertEquals("url-601", response); // Resolves to type-specific non-primary (fallback 2)
    }

    @Test
    @DisplayName("G. Product with multiple images and displayOrder")
    void testDisplayOrderSorting() {
        mockStorageService();
        List<ProductImage> images = new ArrayList<>();

        images.add(createImage(700L, null, true, 10));
        images.add(createImage(701L, null, true, 2)); // Lowest displayOrder among primaries
        images.add(createImage(702L, null, true, 5));

        String response = productImageResolver.resolveImage(images, null); // No context
        assertEquals("url-701", response);
    }

    @Test
    @DisplayName("H. Product with missing/null image metadata")
    void testMissingImageMetadata() {
        mockStorageService();
        List<ProductImage> images = new ArrayList<>();

        // All non-primary shared
        images.add(createImage(800L, null, false, 10));
        images.add(createImage(801L, "   ", false, 5)); // Whitespace is treated as empty

        String response = productImageResolver.resolveImage(images, "ATTAR");
        assertEquals("url-801", response); // Resolves to shared non-primary (fallback 4)
    }

    @Test
    @DisplayName("I. Product with no images")
    void testNoImages() {
        List<ProductImage> images = new ArrayList<>();
        String response = productImageResolver.resolveImage(images, "PERFUME");
        assertNull(response);
    }

    @Test
    @DisplayName("Fallback Null/Empty Safe")
    void testNullSafeties() {
        assertNull(productImageResolver.resolveImage(null, "ATTAR"));
    }
}
