package com.alahadattars.controller;

import com.alahadattars.dto.homepage.HomepageDataResponse;
import com.alahadattars.service.PublicHomepageService;
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
public class PublicHomepageControllerCacheTest {

    @Autowired
    private PublicHomepageController publicHomepageController;

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
    void testGetHomepageData_CacheMissThenHit() {
        HomepageDataResponse mockResponse = new HomepageDataResponse();
        when(publicHomepageService.getHomepageData()).thenReturn(mockResponse);

        // First call - cache miss
        publicHomepageController.getHomepageData();
        verify(publicHomepageService, times(1)).getHomepageData();

        // Second call - cache hit
        publicHomepageController.getHomepageData();
        verify(publicHomepageService, times(1)).getHomepageData(); // Still 1

        // Clear cache (simulate eviction via OrderServiceImpl)
        cacheManager.getCache("homepage").clear();

        // Third call - cache miss again
        publicHomepageController.getHomepageData();
        verify(publicHomepageService, times(2)).getHomepageData();
    }
}
