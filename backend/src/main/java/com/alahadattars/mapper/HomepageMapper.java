package com.alahadattars.mapper;

import com.alahadattars.dto.homepage.HeroBannerResponse;
import com.alahadattars.dto.homepage.HomepageSectionResponse;
import com.alahadattars.dto.homepage.PromoBannerResponse;
import com.alahadattars.dto.homepage.TestimonialResponse;
import com.alahadattars.dto.homepage.WhyChooseUsItemResponse;
import com.alahadattars.entity.HeroBanner;
import com.alahadattars.entity.HomepageSection;
import com.alahadattars.entity.PromoBanner;
import com.alahadattars.entity.Testimonial;
import com.alahadattars.entity.WhyChooseUsItem;
import com.alahadattars.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Component
@RequiredArgsConstructor
public class HomepageMapper {

    private final StorageService storageService;

    private String resolveUrl(String imageUrl, String proxyPathFallback, LocalDateTime updatedAt, boolean bustCache) {
        String resolved = storageService.resolveUrl(imageUrl, proxyPathFallback);
        if (resolved == null || !bustCache) {
            return resolved;
        }
        String buster = "v=" + (updatedAt != null ? updatedAt.toEpochSecond(ZoneOffset.UTC) : System.currentTimeMillis());
        return resolved.contains("?") ? resolved + "&" + buster : resolved + "?" + buster;
    }

    public HomepageSectionResponse mapSection(HomepageSection s, boolean bustCache) {
        return HomepageSectionResponse.builder()
                .id(s.getId())
                .sectionKey(s.getSectionKey())
                .title(s.getTitle())
                .subtitle(s.getSubtitle())
                .description(s.getDescription())
                .visible(s.isVisible())
                .displayOrder(s.getDisplayOrder())
                .maxItems(s.getMaxItems())
                .imageUrl(resolveUrl(s.getImageUrl(), "/api/homepage/sections/" + s.getSectionKey() + "/image", s.getUpdatedAt(), bustCache))
                .build();
    }

    public HeroBannerResponse mapHero(HeroBanner h, boolean bustCache) {
        return HeroBannerResponse.builder()
                .id(h.getId())
                .title(h.getTitle())
                .subtitle(h.getSubtitle())
                .description(h.getDescription())
                .buttonText(h.getButtonText())
                .buttonUrl(h.getButtonUrl())
                .badge(h.getBadge())
                .imageUrl(resolveUrl(h.getImageUrl(), "/api/homepage/heroes/" + h.getId() + "/image", h.getUpdatedAt(), bustCache))
                .mobileImageUrl(resolveUrl(h.getMobileImageUrl(), "/api/homepage/heroes/" + h.getId() + "/mobile-image", h.getUpdatedAt(), bustCache))
                .active(h.isActive())
                .displayOrder(h.getDisplayOrder())
                .build();
    }

    public PromoBannerResponse mapPromo(PromoBanner p, boolean bustCache) {
        return PromoBannerResponse.builder()
                .id(p.getId())
                .title(p.getTitle())
                .subtitle(p.getSubtitle())
                .imageUrl(resolveUrl(p.getImageUrl(), "/api/homepage/banners/" + p.getId() + "/image", p.getUpdatedAt(), bustCache))
                .buttonText(p.getButtonText())
                .buttonUrl(p.getButtonUrl())
                .backgroundColor(p.getBackgroundColor())
                .priority(p.getPriority())
                .startDate(p.getStartDate())
                .endDate(p.getEndDate())
                .active(p.isActive())
                .build();
    }

    public TestimonialResponse mapTestimonial(Testimonial t, boolean bustCache) {
        return TestimonialResponse.builder()
                .id(t.getId())
                .customerName(t.getCustomerName())
                .photoUrl(resolveUrl(t.getPhotoUrl(), "/api/homepage/testimonials/" + t.getId() + "/photo", t.getUpdatedAt(), bustCache))
                .rating(t.getRating())
                .review(t.getReview())
                .displayOrder(t.getDisplayOrder())
                .active(t.isActive())
                .build();
    }

    public WhyChooseUsItemResponse mapWhyChoose(WhyChooseUsItem w) {
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
