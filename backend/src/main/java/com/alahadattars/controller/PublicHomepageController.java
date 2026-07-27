package com.alahadattars.controller;

import com.alahadattars.dto.homepage.HomepageDataResponse;
import com.alahadattars.entity.HeroBanner;
import com.alahadattars.entity.PromoBanner;
import com.alahadattars.entity.Testimonial;
import com.alahadattars.repository.HeroBannerRepository;
import com.alahadattars.repository.PromoBannerRepository;
import com.alahadattars.repository.TestimonialRepository;
import com.alahadattars.response.ApiResponse;
import com.alahadattars.service.PublicHomepageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/homepage")
@RequiredArgsConstructor
public class PublicHomepageController {

    private final PublicHomepageService publicHomepageService;
    private final HeroBannerRepository heroBannerRepository;
    private final PromoBannerRepository promoBannerRepository;
    private final TestimonialRepository testimonialRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<HomepageDataResponse>> getHomepageData() {
        return ResponseEntity.ok(ApiResponse.<HomepageDataResponse>builder()
                .success(true)
                .message("Homepage data retrieved successfully")
                .data(publicHomepageService.getHomepageData())
                .build());
    }

    @GetMapping("/heroes/{id}/image")
    public ResponseEntity<Resource> serveHeroImage(@PathVariable Long id) {
        HeroBanner hero = heroBannerRepository.findById(id).orElse(null);
        if (hero == null || hero.getImageUrl() == null || hero.getImageUrl().isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return serveFile(hero.getImageUrl());
    }

    @GetMapping("/heroes/{id}/mobile-image")
    public ResponseEntity<Resource> serveHeroMobileImage(@PathVariable Long id) {
        HeroBanner hero = heroBannerRepository.findById(id).orElse(null);
        if (hero == null || hero.getMobileImageUrl() == null || hero.getMobileImageUrl().isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return serveFile(hero.getMobileImageUrl());
    }

    @GetMapping("/banners/{id}/image")
    public ResponseEntity<Resource> servePromoImage(@PathVariable Long id) {
        PromoBanner banner = promoBannerRepository.findById(id).orElse(null);
        if (banner == null || banner.getImageUrl() == null || banner.getImageUrl().isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return serveFile(banner.getImageUrl());
    }

    @GetMapping("/testimonials/{id}/photo")
    public ResponseEntity<Resource> serveTestimonialPhoto(@PathVariable Long id) {
        Testimonial testimonial = testimonialRepository.findById(id).orElse(null);
        if (testimonial == null || testimonial.getPhotoUrl() == null || testimonial.getPhotoUrl().isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return serveFile(testimonial.getPhotoUrl());
    }

    private ResponseEntity<Resource> serveFile(String filePath) {
        try {
            Path path = Paths.get(filePath);
            Resource resource = new UrlResource(path.toUri());

            if (resource.exists() && resource.isReadable()) {
                String contentType = "image/png";
                String lowerPath = filePath.toLowerCase();
                if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) {
                    contentType = "image/jpeg";
                } else if (lowerPath.endsWith(".webp")) {
                    contentType = "image/webp";
                } else if (lowerPath.endsWith(".gif")) {
                    contentType = "image/gif";
                } else if (lowerPath.endsWith(".svg")) {
                    contentType = "image/svg+xml";
                }

                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                        .contentType(MediaType.parseMediaType(contentType))
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
