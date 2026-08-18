package com.alahadattars.service.impl;

import com.alahadattars.dto.homepage.*;
import com.alahadattars.entity.*;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.repository.*;
import com.alahadattars.service.HomepageService;
import com.alahadattars.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HomepageServiceImpl implements HomepageService {

    private final HomepageSectionRepository sectionRepository;
    private final HeroBannerRepository heroRepository;
    private final PromoBannerRepository promoRepository;
    private final TestimonialRepository testimonialRepository;
    private final WhyChooseUsItemRepository whyChooseUsRepository;
    private final StorageService storageService;

    // --- Homepage Sections ---

    @Override
    @Transactional(readOnly = true)
    public List<HomepageSectionResponse> getAllSections() {
        return sectionRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(this::mapSection)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public HomepageSectionResponse updateSection(String sectionKey, HomepageSectionRequest request) {
        HomepageSection section = sectionRepository.findBySectionKey(sectionKey)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + sectionKey));

        section.setTitle(request.getTitle());
        section.setSubtitle(request.getSubtitle());
        section.setDescription(request.getDescription());
        section.setVisible(request.isVisible());
        section.setMaxItems(request.getMaxItems());

        return mapSection(sectionRepository.save(section));
    }

    @Override
    @Transactional
    public void reorderSections(List<ReorderRequest> requests) {
        Map<Long, Integer> orderMap = requests.stream()
                .collect(Collectors.toMap(ReorderRequest::getId, ReorderRequest::getDisplayOrder));

        List<HomepageSection> sections = sectionRepository.findAllById(orderMap.keySet());
        for (HomepageSection s : sections) {
            s.setDisplayOrder(orderMap.get(s.getId()));
        }
        sectionRepository.saveAll(sections);
    }

    @Override
    @Transactional
    public HomepageSectionResponse uploadSectionImage(String sectionKey, org.springframework.web.multipart.MultipartFile file) {
        HomepageSection section = sectionRepository.findBySectionKey(sectionKey)
                .orElseThrow(() -> new com.alahadattars.exception.ResourceNotFoundException("Section not found: " + sectionKey));
        
        String path = storageService.uploadFile(file, "sections");
        section.setImageUrl(path);
        
        return mapSection(sectionRepository.save(section));
    }

    // --- Hero Banners ---

    @Override
    @Transactional(readOnly = true)
    public List<HeroBannerResponse> getAllHeroBanners() {
        return heroRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(this::mapHero)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public HeroBannerResponse createHeroBanner(HeroBannerRequest request) {
        HeroBanner banner = HeroBanner.builder()
                .title(request.getTitle())
                .subtitle(request.getSubtitle())
                .description(request.getDescription())
                .buttonText(request.getButtonText())
                .buttonUrl(request.getButtonUrl())
                .badge(request.getBadge())
                .active(request.isActive())
                .displayOrder(0)
                .build();
        return mapHero(heroRepository.save(banner));
    }

    @Override
    @Transactional
    public HeroBannerResponse updateHeroBanner(Long id, HeroBannerRequest request) {
        HeroBanner banner = getHeroBanner(id);
        banner.setTitle(request.getTitle());
        banner.setSubtitle(request.getSubtitle());
        banner.setDescription(request.getDescription());
        banner.setButtonText(request.getButtonText());
        banner.setButtonUrl(request.getButtonUrl());
        banner.setBadge(request.getBadge());
        banner.setActive(request.isActive());
        return mapHero(heroRepository.save(banner));
    }

    @Override
    @Transactional
    public void deleteHeroBanner(Long id) {
        heroRepository.delete(getHeroBanner(id));
    }

    @Override
    @Transactional
    public void reorderHeroBanners(List<ReorderRequest> requests) {
        Map<Long, Integer> orderMap = requests.stream()
                .collect(Collectors.toMap(ReorderRequest::getId, ReorderRequest::getDisplayOrder));
        List<HeroBanner> banners = heroRepository.findAllById(orderMap.keySet());
        for (HeroBanner b : banners) b.setDisplayOrder(orderMap.get(b.getId()));
        heroRepository.saveAll(banners);
    }

    @Override
    @Transactional
    public HeroBannerResponse uploadHeroImage(Long id, MultipartFile file, boolean isMobile) {
        HeroBanner banner = getHeroBanner(id);
        String url = storageService.uploadFile(file, "banners");
        if (isMobile) {
            banner.setMobileImageUrl(url);
        } else {
            banner.setImageUrl(url);
        }
        return mapHero(heroRepository.save(banner));
    }

    private HeroBanner getHeroBanner(Long id) {
        return heroRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Hero banner not found"));
    }

    // --- Promo Banners ---

    @Override
    @Transactional(readOnly = true)
    public List<PromoBannerResponse> getAllPromoBanners() {
        return promoRepository.findAllByOrderByPriorityAsc().stream()
                .map(this::mapPromo)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public PromoBannerResponse createPromoBanner(PromoBannerRequest request) {
        PromoBanner banner = PromoBanner.builder()
                .title(request.getTitle())
                .subtitle(request.getSubtitle())
                .buttonText(request.getButtonText())
                .buttonUrl(request.getButtonUrl())
                .backgroundColor(request.getBackgroundColor())
                .priority(request.getPriority())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .active(request.isActive())
                .build();
        return mapPromo(promoRepository.save(banner));
    }

    @Override
    @Transactional
    public PromoBannerResponse updatePromoBanner(Long id, PromoBannerRequest request) {
        PromoBanner banner = getPromoBanner(id);
        banner.setTitle(request.getTitle());
        banner.setSubtitle(request.getSubtitle());
        banner.setButtonText(request.getButtonText());
        banner.setButtonUrl(request.getButtonUrl());
        banner.setBackgroundColor(request.getBackgroundColor());
        banner.setPriority(request.getPriority());
        banner.setStartDate(request.getStartDate());
        banner.setEndDate(request.getEndDate());
        banner.setActive(request.isActive());
        return mapPromo(promoRepository.save(banner));
    }

    @Override
    @Transactional
    public void deletePromoBanner(Long id) {
        promoRepository.delete(getPromoBanner(id));
    }

    @Override
    @Transactional
    public void reorderPromoBanners(List<ReorderRequest> requests) {
        Map<Long, Integer> orderMap = requests.stream()
                .collect(Collectors.toMap(ReorderRequest::getId, ReorderRequest::getDisplayOrder));
        List<PromoBanner> banners = promoRepository.findAllById(orderMap.keySet());
        for (PromoBanner b : banners) b.setPriority(orderMap.get(b.getId()));
        promoRepository.saveAll(banners);
    }

    @Override
    @Transactional
    public PromoBannerResponse uploadPromoImage(Long id, MultipartFile file) {
        PromoBanner banner = getPromoBanner(id);
        String url = storageService.uploadFile(file, "banners");
        banner.setImageUrl(url);
        return mapPromo(promoRepository.save(banner));
    }

    private PromoBanner getPromoBanner(Long id) {
        return promoRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Promo banner not found"));
    }

    // --- Testimonials ---

    @Override
    @Transactional(readOnly = true)
    public List<TestimonialResponse> getAllTestimonials() {
        return testimonialRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(this::mapTestimonial)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public TestimonialResponse createTestimonial(TestimonialRequest request) {
        Testimonial testimonial = Testimonial.builder()
                .customerName(request.getCustomerName())
                .rating(request.getRating())
                .review(request.getReview())
                .active(request.isActive())
                .displayOrder(0)
                .build();
        return mapTestimonial(testimonialRepository.save(testimonial));
    }

    @Override
    @Transactional
    public TestimonialResponse updateTestimonial(Long id, TestimonialRequest request) {
        Testimonial testimonial = getTestimonial(id);
        testimonial.setCustomerName(request.getCustomerName());
        testimonial.setRating(request.getRating());
        testimonial.setReview(request.getReview());
        testimonial.setActive(request.isActive());
        return mapTestimonial(testimonialRepository.save(testimonial));
    }

    @Override
    @Transactional
    public void deleteTestimonial(Long id) {
        testimonialRepository.delete(getTestimonial(id));
    }

    @Override
    @Transactional
    public void reorderTestimonials(List<ReorderRequest> requests) {
        Map<Long, Integer> orderMap = requests.stream()
                .collect(Collectors.toMap(ReorderRequest::getId, ReorderRequest::getDisplayOrder));
        List<Testimonial> testimonials = testimonialRepository.findAllById(orderMap.keySet());
        for (Testimonial t : testimonials) t.setDisplayOrder(orderMap.get(t.getId()));
        testimonialRepository.saveAll(testimonials);
    }

    @Override
    @Transactional
    public TestimonialResponse uploadTestimonialPhoto(Long id, MultipartFile file) {
        Testimonial testimonial = getTestimonial(id);
        String url = storageService.uploadFile(file, "testimonials");
        testimonial.setPhotoUrl(url);
        return mapTestimonial(testimonialRepository.save(testimonial));
    }

    private Testimonial getTestimonial(Long id) {
        return testimonialRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Testimonial not found"));
    }

    // --- Why Choose Us ---

    @Override
    @Transactional(readOnly = true)
    public List<WhyChooseUsItemResponse> getAllWhyChooseUsItems() {
        return whyChooseUsRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(this::mapWhyChoose)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public WhyChooseUsItemResponse createWhyChooseUsItem(WhyChooseUsItemRequest request) {
        WhyChooseUsItem item = WhyChooseUsItem.builder()
                .icon(request.getIcon())
                .title(request.getTitle())
                .description(request.getDescription())
                .active(request.isActive())
                .displayOrder(0)
                .build();
        return mapWhyChoose(whyChooseUsRepository.save(item));
    }

    @Override
    @Transactional
    public WhyChooseUsItemResponse updateWhyChooseUsItem(Long id, WhyChooseUsItemRequest request) {
        WhyChooseUsItem item = getWhyChooseUsItem(id);
        item.setIcon(request.getIcon());
        item.setTitle(request.getTitle());
        item.setDescription(request.getDescription());
        item.setActive(request.isActive());
        return mapWhyChoose(whyChooseUsRepository.save(item));
    }

    @Override
    @Transactional
    public void deleteWhyChooseUsItem(Long id) {
        whyChooseUsRepository.delete(getWhyChooseUsItem(id));
    }

    @Override
    @Transactional
    public void reorderWhyChooseUsItems(List<ReorderRequest> requests) {
        Map<Long, Integer> orderMap = requests.stream()
                .collect(Collectors.toMap(ReorderRequest::getId, ReorderRequest::getDisplayOrder));
        List<WhyChooseUsItem> items = whyChooseUsRepository.findAllById(orderMap.keySet());
        for (WhyChooseUsItem i : items) i.setDisplayOrder(orderMap.get(i.getId()));
        whyChooseUsRepository.saveAll(items);
    }

    private WhyChooseUsItem getWhyChooseUsItem(Long id) {
        return whyChooseUsRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Item not found"));
    }

    // --- Mappers ---

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
                .imageUrl(storageService.resolveUrl(s.getImageUrl(), "/api/homepage/sections/" + s.getSectionKey() + "/image"))
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
                .imageUrl(storageService.resolveUrl(h.getImageUrl(), "/api/homepage/heroes/" + h.getId() + "/image"))
                .mobileImageUrl(storageService.resolveUrl(h.getMobileImageUrl(), "/api/homepage/heroes/" + h.getId() + "/mobile-image"))
                .active(h.isActive())
                .displayOrder(h.getDisplayOrder())
                .build();
    }

    private PromoBannerResponse mapPromo(PromoBanner p) {
        return PromoBannerResponse.builder()
                .id(p.getId())
                .title(p.getTitle())
                .subtitle(p.getSubtitle())
                .imageUrl(storageService.resolveUrl(p.getImageUrl(), "/api/homepage/banners/" + p.getId() + "/image"))
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
                .photoUrl(storageService.resolveUrl(t.getPhotoUrl(), "/api/homepage/testimonials/" + t.getId() + "/photo"))
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
