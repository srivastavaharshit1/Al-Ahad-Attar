package com.alahadattars.service;

import com.alahadattars.dto.homepage.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface HomepageService {

    // Homepage Sections
    List<HomepageSectionResponse> getAllSections();
    HomepageSectionResponse updateSection(String sectionKey, HomepageSectionRequest request);
    void reorderSections(List<ReorderRequest> requests);

    // Hero Banners
    List<HeroBannerResponse> getAllHeroBanners();
    HeroBannerResponse createHeroBanner(HeroBannerRequest request);
    HeroBannerResponse updateHeroBanner(Long id, HeroBannerRequest request);
    void deleteHeroBanner(Long id);
    void reorderHeroBanners(List<ReorderRequest> requests);
    HeroBannerResponse uploadHeroImage(Long id, MultipartFile file, boolean isMobile);

    // Promo Banners
    List<PromoBannerResponse> getAllPromoBanners();
    PromoBannerResponse createPromoBanner(PromoBannerRequest request);
    PromoBannerResponse updatePromoBanner(Long id, PromoBannerRequest request);
    void deletePromoBanner(Long id);
    void reorderPromoBanners(List<ReorderRequest> requests);
    PromoBannerResponse uploadPromoImage(Long id, MultipartFile file);

    // Testimonials
    List<TestimonialResponse> getAllTestimonials();
    TestimonialResponse createTestimonial(TestimonialRequest request);
    TestimonialResponse updateTestimonial(Long id, TestimonialRequest request);
    void deleteTestimonial(Long id);
    void reorderTestimonials(List<ReorderRequest> requests);
    TestimonialResponse uploadTestimonialPhoto(Long id, MultipartFile file);

    // Why Choose Us
    List<WhyChooseUsItemResponse> getAllWhyChooseUsItems();
    WhyChooseUsItemResponse createWhyChooseUsItem(WhyChooseUsItemRequest request);
    WhyChooseUsItemResponse updateWhyChooseUsItem(Long id, WhyChooseUsItemRequest request);
    void deleteWhyChooseUsItem(Long id);
    void reorderWhyChooseUsItems(List<ReorderRequest> requests);
}
