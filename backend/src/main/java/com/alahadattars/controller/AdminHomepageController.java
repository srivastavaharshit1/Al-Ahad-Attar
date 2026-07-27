package com.alahadattars.controller;

import com.alahadattars.response.ApiResponse;
import com.alahadattars.dto.homepage.*;
import com.alahadattars.service.HomepageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/admin/homepage")
@RequiredArgsConstructor
public class AdminHomepageController {

    private final HomepageService homepageService;

    // --- Sections ---

    @GetMapping("/sections")
    public ResponseEntity<ApiResponse<List<HomepageSectionResponse>>> getAllSections() {
        return ResponseEntity.ok(ApiResponse.success(homepageService.getAllSections()));
    }

    @PutMapping("/sections/{sectionKey}")
    public ResponseEntity<ApiResponse<HomepageSectionResponse>> updateSection(
            @PathVariable String sectionKey, @Valid @RequestBody HomepageSectionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(homepageService.updateSection(sectionKey, request)));
    }

    @PatchMapping("/sections/reorder")
    public ResponseEntity<ApiResponse<Void>> reorderSections(@RequestBody List<ReorderRequest> requests) {
        homepageService.reorderSections(requests);
        return ResponseEntity.ok(ApiResponse.success(null, "Sections reordered successfully"));
    }

    // --- Hero Banners ---

    @GetMapping("/heroes")
    public ResponseEntity<ApiResponse<List<HeroBannerResponse>>> getAllHeroBanners() {
        return ResponseEntity.ok(ApiResponse.success(homepageService.getAllHeroBanners()));
    }

    @PostMapping("/heroes")
    public ResponseEntity<ApiResponse<HeroBannerResponse>> createHeroBanner(@Valid @RequestBody HeroBannerRequest request) {
        return ResponseEntity.ok(ApiResponse.success(homepageService.createHeroBanner(request)));
    }

    @PutMapping("/heroes/{id}")
    public ResponseEntity<ApiResponse<HeroBannerResponse>> updateHeroBanner(
            @PathVariable Long id, @Valid @RequestBody HeroBannerRequest request) {
        return ResponseEntity.ok(ApiResponse.success(homepageService.updateHeroBanner(id, request)));
    }

    @DeleteMapping("/heroes/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteHeroBanner(@PathVariable Long id) {
        homepageService.deleteHeroBanner(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Hero banner deleted"));
    }

    @PatchMapping("/heroes/reorder")
    public ResponseEntity<ApiResponse<Void>> reorderHeroBanners(@RequestBody List<ReorderRequest> requests) {
        homepageService.reorderHeroBanners(requests);
        return ResponseEntity.ok(ApiResponse.success(null, "Hero banners reordered"));
    }

    @PostMapping("/heroes/{id}/image")
    public ResponseEntity<ApiResponse<HeroBannerResponse>> uploadHeroImage(
            @PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.success(homepageService.uploadHeroImage(id, file, false)));
    }

    @PostMapping("/heroes/{id}/mobile-image")
    public ResponseEntity<ApiResponse<HeroBannerResponse>> uploadHeroMobileImage(
            @PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.success(homepageService.uploadHeroImage(id, file, true)));
    }

    // --- Promo Banners ---

    @GetMapping("/banners")
    public ResponseEntity<ApiResponse<List<PromoBannerResponse>>> getAllPromoBanners() {
        return ResponseEntity.ok(ApiResponse.success(homepageService.getAllPromoBanners()));
    }

    @PostMapping("/banners")
    public ResponseEntity<ApiResponse<PromoBannerResponse>> createPromoBanner(@Valid @RequestBody PromoBannerRequest request) {
        return ResponseEntity.ok(ApiResponse.success(homepageService.createPromoBanner(request)));
    }

    @PutMapping("/banners/{id}")
    public ResponseEntity<ApiResponse<PromoBannerResponse>> updatePromoBanner(
            @PathVariable Long id, @Valid @RequestBody PromoBannerRequest request) {
        return ResponseEntity.ok(ApiResponse.success(homepageService.updatePromoBanner(id, request)));
    }

    @DeleteMapping("/banners/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePromoBanner(@PathVariable Long id) {
        homepageService.deletePromoBanner(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Promo banner deleted"));
    }

    @PatchMapping("/banners/reorder")
    public ResponseEntity<ApiResponse<Void>> reorderPromoBanners(@RequestBody List<ReorderRequest> requests) {
        homepageService.reorderPromoBanners(requests);
        return ResponseEntity.ok(ApiResponse.success(null, "Promo banners reordered"));
    }

    @PostMapping("/banners/{id}/image")
    public ResponseEntity<ApiResponse<PromoBannerResponse>> uploadPromoImage(
            @PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.success(homepageService.uploadPromoImage(id, file)));
    }

    // --- Testimonials ---

    @GetMapping("/testimonials")
    public ResponseEntity<ApiResponse<List<TestimonialResponse>>> getAllTestimonials() {
        return ResponseEntity.ok(ApiResponse.success(homepageService.getAllTestimonials()));
    }

    @PostMapping("/testimonials")
    public ResponseEntity<ApiResponse<TestimonialResponse>> createTestimonial(@Valid @RequestBody TestimonialRequest request) {
        return ResponseEntity.ok(ApiResponse.success(homepageService.createTestimonial(request)));
    }

    @PutMapping("/testimonials/{id}")
    public ResponseEntity<ApiResponse<TestimonialResponse>> updateTestimonial(
            @PathVariable Long id, @Valid @RequestBody TestimonialRequest request) {
        return ResponseEntity.ok(ApiResponse.success(homepageService.updateTestimonial(id, request)));
    }

    @DeleteMapping("/testimonials/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTestimonial(@PathVariable Long id) {
        homepageService.deleteTestimonial(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Testimonial deleted"));
    }

    @PatchMapping("/testimonials/reorder")
    public ResponseEntity<ApiResponse<Void>> reorderTestimonials(@RequestBody List<ReorderRequest> requests) {
        homepageService.reorderTestimonials(requests);
        return ResponseEntity.ok(ApiResponse.success(null, "Testimonials reordered"));
    }

    @PostMapping("/testimonials/{id}/photo")
    public ResponseEntity<ApiResponse<TestimonialResponse>> uploadTestimonialPhoto(
            @PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.success(homepageService.uploadTestimonialPhoto(id, file)));
    }

    // --- Why Choose Us ---

    @GetMapping("/why-choose-us")
    public ResponseEntity<ApiResponse<List<WhyChooseUsItemResponse>>> getAllWhyChooseUsItems() {
        return ResponseEntity.ok(ApiResponse.success(homepageService.getAllWhyChooseUsItems()));
    }

    @PostMapping("/why-choose-us")
    public ResponseEntity<ApiResponse<WhyChooseUsItemResponse>> createWhyChooseUsItem(@Valid @RequestBody WhyChooseUsItemRequest request) {
        return ResponseEntity.ok(ApiResponse.success(homepageService.createWhyChooseUsItem(request)));
    }

    @PutMapping("/why-choose-us/{id}")
    public ResponseEntity<ApiResponse<WhyChooseUsItemResponse>> updateWhyChooseUsItem(
            @PathVariable Long id, @Valid @RequestBody WhyChooseUsItemRequest request) {
        return ResponseEntity.ok(ApiResponse.success(homepageService.updateWhyChooseUsItem(id, request)));
    }

    @DeleteMapping("/why-choose-us/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteWhyChooseUsItem(@PathVariable Long id) {
        homepageService.deleteWhyChooseUsItem(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Item deleted"));
    }

    @PatchMapping("/why-choose-us/reorder")
    public ResponseEntity<ApiResponse<Void>> reorderWhyChooseUsItems(@RequestBody List<ReorderRequest> requests) {
        homepageService.reorderWhyChooseUsItems(requests);
        return ResponseEntity.ok(ApiResponse.success(null, "Items reordered"));
    }
}
