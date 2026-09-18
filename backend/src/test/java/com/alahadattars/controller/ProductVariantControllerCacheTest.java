package com.alahadattars.controller;

import com.alahadattars.dto.variant.UpdateStockRequest;
import com.alahadattars.service.ProductVariantService;
import com.alahadattars.service.PublicHomepageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.cache.CacheManager;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@SpringBootTest
@ActiveProfiles("test")
@WithMockUser(roles = "ADMIN")
public class ProductVariantControllerCacheTest {

    @Autowired
    private ProductVariantController productVariantController;

    @Autowired
    private PublicHomepageController publicHomepageController;

    @MockBean
    private ProductVariantService productVariantService;

    @MockBean
    private PublicHomepageService publicHomepageService;

    @Autowired
    private CacheManager cacheManager;

    @BeforeEach
    void setUp() {
        if (cacheManager.getCache("homepage") != null) {
            cacheManager.getCache("homepage").clear();
        }
    }

    @Test
    void testUpdateStock_EvictsHomepageCache() {
        // First load homepage cache
        publicHomepageController.getHomepageData();
        verify(publicHomepageService, times(1)).getHomepageData();

        // Hit homepage again to prove cache works
        publicHomepageController.getHomepageData();
        verify(publicHomepageService, times(1)).getHomepageData(); // Still 1

        // Mutate stock via ProductVariantController
        UpdateStockRequest req = new UpdateStockRequest();
        req.setStock(50);
        productVariantController.updateStock(1L, req);

        // Third call to homepage should miss because it was evicted
        publicHomepageController.getHomepageData();
        verify(publicHomepageService, times(2)).getHomepageData();
    }
}
