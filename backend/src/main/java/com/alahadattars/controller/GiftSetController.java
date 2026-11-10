package com.alahadattars.controller;

import com.alahadattars.dto.giftset.GiftSetResponse;
import com.alahadattars.entity.GiftSetImage;
import com.alahadattars.repository.GiftSetImageRepository;
import com.alahadattars.response.ApiResponse;
import com.alahadattars.service.GiftSetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/gift-sets")
@RequiredArgsConstructor
@Tag(name = "Gift Sets Storefront", description = "Public endpoints for exploring curated gift sets")
public class GiftSetController {

    private final GiftSetService giftSetService;
    private final GiftSetImageRepository giftSetImageRepository;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Operation(summary = "Get all active gift sets")
    @GetMapping
    public ResponseEntity<ApiResponse<List<GiftSetResponse>>> getAllGiftSets() {
        List<GiftSetResponse> giftSets = giftSetService.getAllActiveGiftSets();
        return ResponseEntity.ok(ApiResponse.<List<GiftSetResponse>>builder()
                .success(true)
                .message("Gift sets retrieved successfully")
                .data(giftSets)
                .build());
    }

    @Operation(summary = "Get featured gift sets for homepage showcase")
    @GetMapping("/featured")
    public ResponseEntity<ApiResponse<List<GiftSetResponse>>> getFeaturedGiftSets() {
        List<GiftSetResponse> featured = giftSetService.getFeaturedGiftSets();
        return ResponseEntity.ok(ApiResponse.<List<GiftSetResponse>>builder()
                .success(true)
                .message("Featured gift sets retrieved successfully")
                .data(featured)
                .build());
    }

    @Operation(summary = "Get gift set by slug")
    @GetMapping("/{slug}")
    public ResponseEntity<ApiResponse<GiftSetResponse>> getGiftSetBySlug(@PathVariable String slug) {
        GiftSetResponse giftSet = giftSetService.getGiftSetBySlug(slug);
        return ResponseEntity.ok(ApiResponse.<GiftSetResponse>builder()
                .success(true)
                .message("Gift set retrieved successfully")
                .data(giftSet)
                .build());
    }

    @Operation(summary = "Serve gift set image file (local disk fallback)")
    @GetMapping("/images/{imageId}/file")
    public ResponseEntity<?> serveImage(@PathVariable Long imageId) {
        GiftSetImage image = giftSetImageRepository.findById(imageId).orElse(null);
        if (image == null || image.getImageUrl() == null || image.getImageUrl().isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        String url = image.getImageUrl();
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return ResponseEntity.status(302).location(URI.create(url)).build();
        }

        try {
            Path path = Paths.get(uploadDir, url).normalize();
            Path root = Paths.get(uploadDir).toAbsolutePath().normalize();
            if (!path.toAbsolutePath().normalize().startsWith(root)) {
                log.warn("Path traversal attempt detected for gift set image {}: {}", imageId, url);
                return ResponseEntity.badRequest().build();
            }

            Resource resource = new UrlResource(path.toUri());
            if (resource.exists() && resource.isReadable()) {
                String contentType = Files.probeContentType(path);
                if (contentType == null) {
                    contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
                }
                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                        .header(HttpHeaders.CACHE_CONTROL, "public, max-age=31536000, immutable")
                        .contentType(MediaType.parseMediaType(contentType))
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (IOException e) {
            log.error("Error reading gift set image file {}: {}", imageId, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
}
