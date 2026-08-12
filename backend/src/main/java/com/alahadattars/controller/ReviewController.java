package com.alahadattars.controller;

import com.alahadattars.dto.review.ReportReviewRequest;
import com.alahadattars.dto.review.ReviewRequest;
import com.alahadattars.dto.review.ReviewResponse;
import com.alahadattars.dto.review.ReviewSummaryResponse;
import com.alahadattars.response.ApiResponse;
import com.alahadattars.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.net.MalformedURLException;
import com.alahadattars.repository.ReviewImageRepository;
import com.alahadattars.entity.ReviewImage;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
@Tag(name = "Customer Reviews", description = "APIs for product reviews and ratings")
public class ReviewController {

    private final ReviewService reviewService;
    private final ReviewImageRepository reviewImageRepository;

    @Operation(summary = "Get reviews for a product")
    @GetMapping("/product/{productId}")
    public ResponseEntity<ApiResponse<Page<ReviewResponse>>> getProductReviews(
            @PathVariable Long productId,
            @RequestParam(required = false) Integer rating,
            Authentication authentication,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        
        String email = authentication != null ? authentication.getName() : null;
        Page<ReviewResponse> response = reviewService.getProductReviews(productId, rating, email, pageable);
        
        return ResponseEntity.ok(ApiResponse.<Page<ReviewResponse>>builder()
                .success(true)
                .message("Reviews retrieved successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Get review summary for a product")
    @GetMapping("/product/{productId}/summary")
    public ResponseEntity<ApiResponse<ReviewSummaryResponse>> getProductReviewSummary(@PathVariable Long productId) {
        ReviewSummaryResponse response = reviewService.getProductReviewSummary(productId);
        return ResponseEntity.ok(ApiResponse.<ReviewSummaryResponse>builder()
                .success(true)
                .message("Review summary retrieved successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Create a new review")
    @PostMapping
    public ResponseEntity<ApiResponse<ReviewResponse>> createReview(
            Authentication authentication,
            @Valid @RequestBody ReviewRequest request) {
        ReviewResponse response = reviewService.createReview(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.<ReviewResponse>builder()
                .success(true)
                .message("Review created successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Upload images for a review")
    @PostMapping("/{id}/images")
    public ResponseEntity<ApiResponse<ReviewResponse>> uploadReviewImages(
            Authentication authentication,
            @PathVariable Long id,
            @RequestParam("images") List<MultipartFile> images) {
        ReviewResponse response = reviewService.uploadReviewImages(authentication.getName(), id, images);
        return ResponseEntity.ok(ApiResponse.<ReviewResponse>builder()
                .success(true)
                .message("Images uploaded successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Update an existing review")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ReviewResponse>> updateReview(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody ReviewRequest request) {
        ReviewResponse response = reviewService.updateReview(authentication.getName(), id, request);
        return ResponseEntity.ok(ApiResponse.<ReviewResponse>builder()
                .success(true)
                .message("Review updated successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Delete an existing review")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteReview(
            Authentication authentication,
            @PathVariable Long id) {
        reviewService.deleteReview(authentication.getName(), id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Review deleted successfully")
                .build());
    }

    @Operation(summary = "Toggle helpful vote on a review")
    @PostMapping("/{id}/helpful")
    public ResponseEntity<ApiResponse<ReviewResponse>> toggleHelpfulVote(
            Authentication authentication,
            @PathVariable Long id) {
        ReviewResponse response = reviewService.toggleHelpfulVote(authentication.getName(), id);
        return ResponseEntity.ok(ApiResponse.<ReviewResponse>builder()
                .success(true)
                .message("Vote recorded successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Report a review")
    @PostMapping("/{id}/report")
    public ResponseEntity<ApiResponse<Void>> reportReview(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody ReportReviewRequest request) {
        String email = authentication != null ? authentication.getName() : null;
        reviewService.reportReview(email, id, request);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Review reported successfully")
                .build());
    }

    @org.springframework.beans.factory.annotation.Value("${app.upload.dir:uploads}")
    private String baseUploadDir;

    @Operation(summary = "Serve review image")
    @GetMapping("/images/{imageId}/file")
    public ResponseEntity<?> serveReviewImage(@PathVariable Long imageId) {
        ReviewImage image = reviewImageRepository.findById(imageId).orElse(null);
        if (image == null || image.getImageUrl() == null || image.getImageUrl().isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (image.getImageUrl().startsWith("http://") || image.getImageUrl().startsWith("https://")) {
            return ResponseEntity.status(302).location(java.net.URI.create(image.getImageUrl())).build();
        }

        try {
            Path path = Paths.get(baseUploadDir).resolve(image.getImageUrl()).toAbsolutePath().normalize();
            Resource resource = new UrlResource(path.toUri());

            if (resource.exists() && resource.isReadable()) {
                String contentType = "image/png";
                String lowerPath = image.getImageUrl().toLowerCase();
                if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) {
                    contentType = "image/jpeg";
                } else if (lowerPath.endsWith(".webp")) {
                    contentType = "image/webp";
                } else if (lowerPath.endsWith(".gif")) {
                    contentType = "image/gif";
                }

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .body(resource);
            }
        } catch (MalformedURLException e) {
            log.error("Malformed URL for review image: {}", image.getImageUrl(), e);
        }
        return ResponseEntity.notFound().build();
    }
}
