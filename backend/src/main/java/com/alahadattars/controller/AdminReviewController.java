package com.alahadattars.controller;

import com.alahadattars.dto.review.ReviewResponse;
import com.alahadattars.response.ApiResponse;
import com.alahadattars.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/admin/reviews")
@RequiredArgsConstructor
@Tag(name = "Admin Reviews Management", description = "Admin APIs for managing customer reviews")
public class AdminReviewController {

    private final ReviewService reviewService;

    @Operation(summary = "Get all reviews")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<ReviewResponse>>> getAllReviews(
            @RequestParam(required = false) String search,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        
        Page<ReviewResponse> response = reviewService.getAllReviews(search, pageable);
        return ResponseEntity.ok(ApiResponse.<Page<ReviewResponse>>builder()
                .success(true)
                .message("Reviews retrieved successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Toggle review visibility (hide/unhide)")
    @PatchMapping("/{id}/visibility")
    public ResponseEntity<ApiResponse<ReviewResponse>> toggleVisibility(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> payload) {
        Boolean hide = payload.get("hide");
        ReviewResponse response = reviewService.toggleVisibility(id, hide != null && hide);
        return ResponseEntity.ok(ApiResponse.<ReviewResponse>builder()
                .success(true)
                .message("Review visibility updated")
                .data(response)
                .build());
    }

    @Operation(summary = "Admin reply to a review")
    @PatchMapping("/{id}/reply")
    public ResponseEntity<ApiResponse<ReviewResponse>> adminReply(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload) {
        String reply = payload.get("reply");
        ReviewResponse response = reviewService.adminReply(id, reply);
        return ResponseEntity.ok(ApiResponse.<ReviewResponse>builder()
                .success(true)
                .message("Reply saved successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Delete a review permanently")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteReview(@PathVariable Long id) {
        reviewService.adminDeleteReview(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Review deleted permanently")
                .build());
    }
}
