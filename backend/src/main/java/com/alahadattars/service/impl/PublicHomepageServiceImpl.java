package com.alahadattars.service.impl;

import com.alahadattars.dto.category.CategoryResponse;
import com.alahadattars.dto.homepage.*;
import com.alahadattars.dto.product.ProductSummaryResponse;
import com.alahadattars.entity.*;
import com.alahadattars.mapper.CategoryMapper;
import com.alahadattars.repository.*;
import com.alahadattars.service.ProductService;
import com.alahadattars.service.PublicHomepageService;
import com.alahadattars.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
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
    private final CategoryMapper categoryMapper;
    // Not ProductRepository/ProductMapper directly: getFeaturedProducts() below runs through
    // ProductService so the featured-products branch keeps its own @Transactional(readOnly = true)
    // boundary (needed to lazy-load variants/images during mapping) even when called from a
    // worker thread that has no transaction of its own — see the CompletableFuture below.
    private final ProductService productService;
    private final StorageService storageService;
    private final com.alahadattars.mapper.HomepageMapper homepageMapper;

    // Two Executor beans exist (this one and emailTaskExecutor, see AsyncConfig) — disambiguated
    // by Spring's by-name fallback since the field name matches the @Bean name exactly. A
    // @Qualifier here would be the more explicit way to say that, but Lombok's
    // @RequiredArgsConstructor doesn't copy field annotations onto its generated constructor
    // parameter, so it would be silently ineffective — see AdminDashboardController for the
    // same pool reused the same way.
    private final Executor homepageTaskExecutor;

    @Override
    public HomepageDataResponse getHomepageData() {
        // Gates which of the sections below are even worth fetching, so this has to resolve first.
        List<HomepageSection> sections = sectionRepository.findByVisibleTrueOrderByDisplayOrderAsc();
        Map<String, HomepageSection> sectionMap = sections.stream()
                .collect(Collectors.toMap(HomepageSection::getSectionKey, s -> s));

        HomepageDataResponse response = new HomepageDataResponse();
        response.setSections(sections.stream().map(this::mapSection).collect(Collectors.toList()));

        // Each of these is an independent read against a different table — running them
        // concurrently instead of one after another turns N sequential DB round trips into
        // roughly max(N) instead of sum(N).
        CompletableFuture<List<HeroBannerResponse>> heroesFuture = sectionMap.containsKey("hero")
                ? CompletableFuture.supplyAsync(() -> heroRepository.findByActiveTrueOrderByDisplayOrderAsc()
                        .stream().map(this::mapHero).collect(Collectors.toList()), homepageTaskExecutor)
                : CompletableFuture.completedFuture(new ArrayList<>());

        CompletableFuture<List<PromoBannerResponse>> promoBannersFuture = sectionMap.containsKey("promo_banners")
                ? CompletableFuture.supplyAsync(() -> promoRepository.findActiveAndValidBanners(LocalDateTime.now())
                        .stream().map(this::mapPromo).collect(Collectors.toList()), homepageTaskExecutor)
                : CompletableFuture.completedFuture(new ArrayList<>());

        CompletableFuture<List<CategoryResponse>> categoriesFuture = sectionMap.containsKey("categories")
                ? CompletableFuture.supplyAsync(() -> {
                    int limit = sectionMap.get("categories").getMaxItems() != null ? sectionMap.get("categories").getMaxItems() : 4;
                    List<Category> cats = categoryRepository.findByActiveTrueAndShowOnHomepageTrueOrderByHomepageDisplayOrderAsc();
                    if (cats.size() > limit) cats = cats.subList(0, limit);
                    return cats.stream().map(categoryMapper::toResponse).collect(Collectors.toList());
                }, homepageTaskExecutor)
                : CompletableFuture.completedFuture(new ArrayList<>());

        CompletableFuture<List<ProductSummaryResponse>> featuredProductsFuture = sectionMap.containsKey("featured_products")
                ? CompletableFuture.supplyAsync(() -> {
                    int limit = sectionMap.get("featured_products").getMaxItems() != null ? sectionMap.get("featured_products").getMaxItems() : 8;
                    List<ProductSummaryResponse> prods = productService.getFeaturedProducts();
                    return prods.size() > limit ? prods.subList(0, limit) : prods;
                }, homepageTaskExecutor)
                : CompletableFuture.completedFuture(new ArrayList<>());

        CompletableFuture<List<TestimonialResponse>> testimonialsFuture = sectionMap.containsKey("testimonials")
                ? CompletableFuture.supplyAsync(() -> testimonialRepository.findByActiveTrueOrderByDisplayOrderAsc()
                        .stream().map(this::mapTestimonial).collect(Collectors.toList()), homepageTaskExecutor)
                : CompletableFuture.completedFuture(new ArrayList<>());

        CompletableFuture<List<WhyChooseUsItemResponse>> whyChooseUsFuture = sectionMap.containsKey("why_choose_us")
                ? CompletableFuture.supplyAsync(() -> whyChooseUsRepository.findByActiveTrueOrderByDisplayOrderAsc()
                        .stream().map(this::mapWhyChoose).collect(Collectors.toList()), homepageTaskExecutor)
                : CompletableFuture.completedFuture(new ArrayList<>());

        CompletableFuture.allOf(heroesFuture, promoBannersFuture, categoriesFuture,
                featuredProductsFuture, testimonialsFuture, whyChooseUsFuture).join();

        response.setHeroes(heroesFuture.join());
        response.setPromoBanners(promoBannersFuture.join());
        response.setCategories(categoriesFuture.join());
        response.setFeaturedProducts(featuredProductsFuture.join());
        response.setTestimonials(testimonialsFuture.join());
        response.setWhyChooseUsItems(whyChooseUsFuture.join());

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
        return homepageMapper.mapSection(s, false);
    }

    private HeroBannerResponse mapHero(HeroBanner h) {
        return homepageMapper.mapHero(h, false);
    }


    private PromoBannerResponse mapPromo(PromoBanner p) {
        return homepageMapper.mapPromo(p, false);
    }

    private TestimonialResponse mapTestimonial(Testimonial t) {
        return homepageMapper.mapTestimonial(t, false);
    }


    private WhyChooseUsItemResponse mapWhyChoose(WhyChooseUsItem w) {
        return homepageMapper.mapWhyChoose(w);
    }
}
