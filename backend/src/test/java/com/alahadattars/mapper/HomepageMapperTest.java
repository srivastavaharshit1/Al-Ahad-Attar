package com.alahadattars.mapper;

import com.alahadattars.dto.homepage.HeroBannerResponse;
import com.alahadattars.dto.homepage.HomepageDataResponse;
import com.alahadattars.dto.homepage.HomepageSectionResponse;
import com.alahadattars.dto.homepage.PromoBannerResponse;
import com.alahadattars.dto.homepage.TestimonialResponse;
import com.alahadattars.dto.homepage.WhyChooseUsItemResponse;
import com.alahadattars.entity.HeroBanner;
import com.alahadattars.entity.HomepageSection;
import com.alahadattars.entity.PromoBanner;
import com.alahadattars.entity.Testimonial;
import com.alahadattars.entity.WhyChooseUsItem;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.HeroBannerRepository;
import com.alahadattars.repository.HomepageSectionRepository;
import com.alahadattars.repository.PromoBannerRepository;
import com.alahadattars.repository.TestimonialRepository;
import com.alahadattars.repository.WhyChooseUsItemRepository;
import com.alahadattars.service.ProductService;
import com.alahadattars.service.StorageService;
import com.alahadattars.service.impl.HomepageServiceImpl;
import com.alahadattars.service.impl.PublicHomepageServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class HomepageMapperTest {

    @Mock private StorageService storageService;

    // For keeping the service-level tests
    @Mock private HomepageSectionRepository sectionRepository;
    @Mock private HeroBannerRepository heroRepository;
    @Mock private PromoBannerRepository promoRepository;
    @Mock private TestimonialRepository testimonialRepository;
    @Mock private WhyChooseUsItemRepository whyChooseUsRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private CategoryMapper categoryMapper;
    @Mock private ProductService productService;

    private HomepageMapper mapper;
    private HomepageServiceImpl adminService;
    private PublicHomepageServiceImpl publicService;

    @BeforeEach
    void setUp() {
        mapper = new HomepageMapper(storageService);

        publicService = new PublicHomepageServiceImpl(
                sectionRepository, heroRepository, promoRepository, testimonialRepository,
                whyChooseUsRepository, categoryRepository, categoryMapper, productService,
                storageService, mapper, Runnable::run);

        adminService = new HomepageServiceImpl(
                sectionRepository, heroRepository, promoRepository, testimonialRepository,
                whyChooseUsRepository, storageService, mapper);
    }

    // --- Direct Mapper Tests ---

    @Test
    void testMapSection() {
        HomepageSection s = new HomepageSection();
        s.setId(1L);
        s.setSectionKey("hero");
        s.setTitle("Title");
        s.setSubtitle("Sub");
        s.setDescription("Desc");
        s.setVisible(true);
        s.setDisplayOrder(5);
        s.setMaxItems(3);
        s.setImageUrl("raw.jpg");

        when(storageService.resolveUrl("raw.jpg", "/api/homepage/sections/hero/image")).thenReturn("http://mock/raw.jpg");

        HomepageSectionResponse res = mapper.mapSection(s, false);
        assertEquals(1L, res.getId());
        assertEquals("hero", res.getSectionKey());
        assertEquals("Title", res.getTitle());
        assertEquals("Sub", res.getSubtitle());
        assertEquals("Desc", res.getDescription());
        assertTrue(res.isVisible());
        assertEquals(5, res.getDisplayOrder());
        assertEquals(3, res.getMaxItems());
        assertEquals("http://mock/raw.jpg", res.getImageUrl());
    }

    @Test
    void testMapWhyChooseUsItem() {
        WhyChooseUsItem w = new WhyChooseUsItem();
        w.setId(10L);
        w.setIcon("star");
        w.setTitle("Quality");
        w.setDescription("Best");
        w.setDisplayOrder(1);
        w.setActive(true);

        WhyChooseUsItemResponse res = mapper.mapWhyChoose(w);
        assertEquals(10L, res.getId());
        assertEquals("star", res.getIcon());
        assertEquals("Quality", res.getTitle());
        assertEquals("Best", res.getDescription());
        assertEquals(1, res.getDisplayOrder());
        assertTrue(res.isActive());
    }

    @Test
    void testRegressionAdminVsPublicUrlSemantics() {
        // same image input -> Admin mapper adds cache-buster -> Public mapper does not
        HeroBanner banner = new HeroBanner();
        banner.setId(1L);
        banner.setImageUrl("test.jpg");
        LocalDateTime now = LocalDateTime.now();
        banner.setUpdatedAt(now);

        when(storageService.resolveUrl(eq("test.jpg"), anyString())).thenReturn("http://mock/test.jpg");

        HeroBannerResponse adminRes = mapper.mapHero(banner, true);
        HeroBannerResponse publicRes = mapper.mapHero(banner, false);

        long buster = now.toEpochSecond(ZoneOffset.UTC);
        assertEquals("http://mock/test.jpg?v=" + buster, adminRes.getImageUrl());
        assertEquals("http://mock/test.jpg", publicRes.getImageUrl());
    }

    @Test
    void testUrlWithExistingQueryParams() {
        HeroBanner banner = new HeroBanner();
        banner.setId(1L);
        banner.setImageUrl("test.jpg");
        LocalDateTime now = LocalDateTime.now();
        banner.setUpdatedAt(now);

        // URL already has a query param
        when(storageService.resolveUrl(eq("test.jpg"), anyString())).thenReturn("http://mock/test.jpg?size=large");

        HeroBannerResponse adminRes = mapper.mapHero(banner, true);

        long buster = now.toEpochSecond(ZoneOffset.UTC);
        assertEquals("http://mock/test.jpg?size=large&v=" + buster, adminRes.getImageUrl(), "Should append with &");
    }

    @Test
    void testNullUpdatedAtBehavior() {
        PromoBanner banner = new PromoBanner();
        banner.setId(2L);
        banner.setImageUrl("promo.jpg");
        banner.setUpdatedAt(null); // null updatedAt

        when(storageService.resolveUrl(eq("promo.jpg"), anyString())).thenReturn("http://mock/promo.jpg");

        long before = System.currentTimeMillis();
        PromoBannerResponse adminRes = mapper.mapPromo(banner, true);
        long after = System.currentTimeMillis();

        String url = adminRes.getImageUrl();
        assertTrue(url.startsWith("http://mock/promo.jpg?v="));
        long buster = Long.parseLong(url.substring(url.indexOf("v=") + 2));
        assertTrue(buster >= before && buster <= after, "Should fallback to current time millis");
    }

    @Test
    void testNullUrlHandling() {
        Testimonial t = new Testimonial();
        t.setId(3L);
        t.setPhotoUrl(null);
        t.setUpdatedAt(LocalDateTime.now());

        when(storageService.resolveUrl(null, "/api/homepage/testimonials/3/photo")).thenReturn(null);

        TestimonialResponse adminRes = mapper.mapTestimonial(t, true);
        assertNull(adminRes.getPhotoUrl(), "Null resolved URL should remain null without NPE");
    }

    // --- Service-Level Characterization Tests (Preserved) ---

    @Test
    void testNewsletterConditionalMapping() {
        HomepageSection nl = new HomepageSection();
        nl.setSectionKey("newsletter");
        nl.setTitle("Join Us");
        nl.setSubtitle("Stay updated");
        nl.setDescription(null); // Null description -> falls back to "Subscribe"

        when(sectionRepository.findByVisibleTrueOrderByDisplayOrderAsc()).thenReturn(List.of(nl));

        HomepageDataResponse result = publicService.getHomepageData();

        assertNotNull(result.getNewsletterConfig());
        assertEquals("Join Us", result.getNewsletterConfig().getTitle());
        assertEquals("Stay updated", result.getNewsletterConfig().getSubtitle());
        assertEquals("Subscribe", result.getNewsletterConfig().getButtonText(), "Null description should map to 'Subscribe'");
        assertEquals("Thanks for subscribing!", result.getNewsletterConfig().getSuccessMessage());

        nl.setDescription("");
        result = publicService.getHomepageData();
        assertEquals("Subscribe", result.getNewsletterConfig().getButtonText(), "Empty description should map to 'Subscribe'");

        nl.setDescription("Get Alerts");
        result = publicService.getHomepageData();
        assertEquals("Get Alerts", result.getNewsletterConfig().getButtonText(), "Populated description should map to buttonText");
    }

    @Test
    void testEmptyCollectionHandling() {
        when(sectionRepository.findByVisibleTrueOrderByDisplayOrderAsc()).thenReturn(Collections.emptyList());

        HomepageDataResponse result = publicService.getHomepageData();

        assertNotNull(result);
        assertTrue(result.getSections().isEmpty());
        assertTrue(result.getHeroes().isEmpty());
        assertTrue(result.getPromoBanners().isEmpty());
        assertTrue(result.getCategories().isEmpty());
        assertTrue(result.getFeaturedProducts().isEmpty());
        assertTrue(result.getTestimonials().isEmpty());
        assertTrue(result.getWhyChooseUsItems().isEmpty());
        assertNull(result.getNewsletterConfig());
    }

    @Test
    void testOrderingBehaviorPublic() {
        HomepageSection testSection = new HomepageSection();
        testSection.setSectionKey("testimonials");

        Testimonial t1 = new Testimonial();
        t1.setId(10L);
        t1.setCustomerName("Alice");

        Testimonial t2 = new Testimonial();
        t2.setId(20L);
        t2.setCustomerName("Bob");

        when(sectionRepository.findByVisibleTrueOrderByDisplayOrderAsc()).thenReturn(List.of(testSection));
        when(testimonialRepository.findByActiveTrueOrderByDisplayOrderAsc()).thenReturn(List.of(t1, t2));

        HomepageDataResponse result = publicService.getHomepageData();

        assertEquals(2, result.getTestimonials().size());
        assertEquals(10L, result.getTestimonials().get(0).getId());
        assertEquals(20L, result.getTestimonials().get(1).getId());
    }
}
