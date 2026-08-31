package com.alahadattars.controller;

import com.alahadattars.dto.product.BulkPricingApplyResponse;
import com.alahadattars.dto.product.BulkPricingPreviewResponse;
import com.alahadattars.dto.product.BulkPricingRequest;
import com.alahadattars.entity.BulkPriceAudit;
import com.alahadattars.entity.User;
import com.alahadattars.response.ApiResponse;
import com.alahadattars.service.BulkPricingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import com.alahadattars.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.cache.annotation.CacheEvict;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/admin/products/pricing")
@RequiredArgsConstructor
@Tag(name = "Admin Bulk Pricing", description = "APIs for bulk price management")
@PreAuthorize("hasRole('ADMIN')")
public class AdminBulkPricingController {

    private final BulkPricingService bulkPricingService;
    private final UserRepository userRepository;

    @Operation(summary = "Preview a bulk price adjustment without applying it")
    @PostMapping("/preview")
    public ResponseEntity<ApiResponse<BulkPricingPreviewResponse>> preview(
            @Valid @RequestBody BulkPricingRequest request) {
        log.info("Preview bulk pricing request: {}", request);
        BulkPricingPreviewResponse preview = bulkPricingService.preview(request);
        return ResponseEntity.ok(ApiResponse.<BulkPricingPreviewResponse>builder()
                .success(true)
                .data(preview)
                .build());
    }

    @Operation(summary = "Apply a bulk price adjustment transactionally")
    @PostMapping("/apply")
    @CacheEvict(value = {"products", "homepage"}, allEntries = true)
    public ResponseEntity<ApiResponse<BulkPricingApplyResponse>> apply(
            @Valid @RequestBody BulkPricingRequest request) {
        
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User admin = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Admin not found"));
                
        log.info("Apply bulk pricing request by admin {}: {}", admin.getEmail(), request);
        BulkPricingApplyResponse result = bulkPricingService.apply(request, admin);
        return ResponseEntity.ok(ApiResponse.<BulkPricingApplyResponse>builder()
                .success(true)
                .message("Bulk pricing successfully applied.")
                .data(result)
                .build());
    }

    @Operation(summary = "Get bulk pricing audit history")
    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<BulkPriceAudit>>> getHistory() {
        return ResponseEntity.ok(ApiResponse.<List<BulkPriceAudit>>builder()
                .success(true)
                .data(bulkPricingService.getHistory())
                .build());
    }
}
