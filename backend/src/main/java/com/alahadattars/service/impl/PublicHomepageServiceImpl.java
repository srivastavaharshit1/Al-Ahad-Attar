package com.alahadattars.service.impl;

import com.alahadattars.dto.category.CategoryResponse;
import com.alahadattars.dto.homepage.*;
import com.alahadattars.dto.product.ProductSummaryResponse;
import com.alahadattars.entity.*;
import com.alahadattars.mapper.CategoryMapper;
import com.alahadattars.mapper.ProductMapper;
import com.alahadattars.repository.*;
import com.alahadattars.service.PublicHomepageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PublicHomepageServiceImpl implements PublicHomepageService {

    private final HomepageSectionRepository sectionRepository;
    private final HeroBannerRepository heroRepository;
    private final PromoBannerRepository promoRepository;
    private final TestimonialRepository testimonialRepository;
    private final WhyChooseUsItemRepository whyChooseUsRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final CategoryMapper categoryMapper;
    private final ProductMapper productMapper;

    @Override
    @Transactional(readOnly = true)
    public HomepageDataResponse getHomepageData() {
        // 1. Get all visible sections ordered
        List<HomepageSection> sections = sectionRepository.findByVisibleTrueOrderByDisplayOrderAsc();
        Map<String, HomepageSection> sectionMap = sections.stream()
                .collect(Collectors.toMap(HomepageSection::getSectionKey, s -> s));

        HomepageDataResponse response = new HomepageDataResponse();
        
        // Map sections to response
        response.setSections(sections.stream().map(this::mapSection).collect(Collectors.toList()));

        // 2. Conditionally fetch data based on visible sections
        if (sectionMap.containsKey("hero")) {
            response.setHeroes(heroRepository.findByActiveTrueOrderByDisplayOrderAsc()
                    .stream().map(this::mapHero).collect(Collectors.toList()));
        } else {
            response.setHeroes(new ArrayList<>());
        }

        if (sectionMap.containsKey("promo_banners")) {
            response.setPromoBanners(promoRepository.findActiveAndValidBanners(LocalDateTime.now())
                    .stream().map(this::mapPromo).collect(Collectors.toList()));
        } else {
            response.setPromoBanners(new ArrayList<>());
        }

        if (sectionMap.containsKey("categories")) {
            HomepageSection catSec = sectionMap.get("categories");
            int limit = catSec.getMaxItems() != null ? catSec.getMaxItems() : 4;
            List<Category> cats = categoryRepository.findByActiveTrueAndShowOnHomepageTrueOrderByHomepageDisplayOrderAsc();
            // simple limit
            if (cats.size() > limit) cats = cats.subList(0, limit);
            response.setCategories(cats.stream().map(categoryMapper::toResponse).collect(Collectors.toList()));
        } else {
            response.setCategories(new ArrayList<>());
        }

        if (sectionMap.containsKey("featured_products")) {
            HomepageSection prodSec = sectionMap.get("featured_products");
            int limit = prodSec.getMaxItems() != null ? prodSec.getMaxItems() : 8;
            List<Product> prods = productRepository.findByFeaturedTrue();
            if (prods.size() > limit) prods = prods.subList(0, limit);
            response.setFeaturedProducts(prods.stream().map(productMapper::toSummaryResponse).collect(Collectors.toList()));
        } else {
            response.setFeaturedProducts(new ArrayList<>());
        }

        if (sectionMap.containsKey("testimonials")) {
            response.setTestimonials(testimonialRepository.findByActiveTrueOrderByDisplayOrderAsc()
                    .stream().map(this::mapTestimonial).collect(Collectors.toList()));
        } else {
            response.setTestimonials(new ArrayList<>());
        }

        if (sectionMap.containsKey("why_choose_us")) {
            response.setWhyChooseUsItems(whyChooseUsRepository.findByActiveTrueOrderByDisplayOrderAsc()
                    .stream().map(this::mapWhyChoose).collect(Collectors.toList()));
        } else {
            response.setWhyChooseUsItems(new ArrayList<>());
        }

        if (sectionMap.containsKey("newsletter")) {
            HomepageSection nl = sectionMap.get("newsletter");
            response.setNewsletterConfig(NewsletterConfigResponse.builder()
                    .title(nl.getTitle())
                    .subtitle(nl.getSubtitle())
                    .buttonText(nl.getDescription() != null && !nl.getDescription().isEmpty() ? nl.getDescription() : "Subscribe")
                    .successMessage("Thanks for subscribing!")
                    .build());
        }

        return response;
    }

    private HomepageSectionResponse mapSection(HomepageSection s) {
        return HomepageSectionResponse.builder()
                .id(s.getId())
                .sectionKey(s.getSectionKey())
                .title(s.getTitle())
                .subtitle(s.getSubtitle())
                .description(s.getDescription())
                .visible(s.isVisible())
                .displayOrder(s.getDisplayOrder())
                .maxItems(s.getMaxItems())
                .build();
    }

    private HeroBannerResponse mapHero(HeroBanner h) {
        return HeroBannerResponse.builder()
                .id(h.getId())
                .title(h.getTitle())
                .subtitle(h.getSubtitle())
                .description(h.getDescription())
                .buttonText(h.getButtonText())
                .buttonUrl(h.getButtonUrl())
                .badge(h.getBadge())
                .imageUrl(h.getImageUrl() != null ? "/api/homepage/heroes/" + h.getId() + "/image" : null)
                .mobileImageUrl(h.getMobileImageUrl() != null ? "/api/homepage/heroes/" + h.getId() + "/mobile-image" : null)
                .active(h.isActive())
                .displayOrder(h.getDisplayOrder())
                .build();
    }


    private PromoBannerResponse mapPromo(PromoBanner p) {
        return PromoBannerResponse.builder()
                .id(p.getId())
                .title(p.getTitle())
                .subtitle(p.getSubtitle())
                .imageUrl(p.getImageUrl() != null ? "/api/homepage/banners/" + p.getId() + "/image" : null)
                .buttonText(p.getButtonText())
                .buttonUrl(p.getButtonUrl())
                .backgroundColor(p.getBackgroundColor())
                .priority(p.getPriority())
                .startDate(p.getStartDate())
                .endDate(p.getEndDate())
                .active(p.isActive())
                .build();
    }

    private TestimonialResponse mapTestimonial(Testimonial t) {
        return TestimonialResponse.builder()
                .id(t.getId())
                .customerName(t.getCustomerName())
                .photoUrl(t.getPhotoUrl() != null ? "/api/homepage/testimonials/" + t.getId() + "/photo" : null)
                .rating(t.getRating())
                .review(t.getReview())
                .displayOrder(t.getDisplayOrder())
                .active(t.isActive())
                .build();
    }

    private WhyChooseUsItemResponse mapWhyChoose(WhyChooseUsItem w) {
        return WhyChooseUsItemResponse.builder()
                .id(w.getId())
                .icon(w.getIcon())
                .title(w.getTitle())
                .description(w.getDescription())
                .displayOrder(w.getDisplayOrder())
                .active(w.isActive())
                .build();
    }
}
