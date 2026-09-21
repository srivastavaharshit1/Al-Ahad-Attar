package com.alahadattars.controller;

import com.alahadattars.dto.promotion.PromotionRequest;
import com.alahadattars.dto.promotion.PromotionResponse;
import com.alahadattars.entity.Promotion;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.repository.PromotionRepository;
import com.alahadattars.response.ApiResponse;
import com.alahadattars.service.impl.PromotionConfigValidator;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/promotions")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Promotions", description = "Admin APIs for managing promotions")
public class AdminPromotionController {

    private final PromotionRepository promotionRepository;
    private final PromotionConfigValidator promotionConfigValidator;
    private final com.alahadattars.service.impl.PromotionResponseMapper promotionResponseMapper;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<PromotionResponse>>> getAllPromotions(
            @RequestParam(required = false) String search,
            Pageable pageable) {
        
        Page<Promotion> promotions;
        if (search != null && !search.isEmpty()) {
            promotions = promotionRepository.findByNameContainingIgnoreCase(search, pageable);
        } else {
            promotions = promotionRepository.findAll(pageable);
        }
        
        Page<PromotionResponse> responsePage = promotions.map(this::toResponse);
        
        return ResponseEntity.ok(ApiResponse.<Page<PromotionResponse>>builder()
                .success(true)
                .data(responsePage)
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PromotionResponse>> getPromotion(@PathVariable Long id) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Promotion not found"));
                
        return ResponseEntity.ok(ApiResponse.<PromotionResponse>builder()
                .success(true)
                .data(toResponse(promotion))
                .build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PromotionResponse>> createPromotion(@Valid @RequestBody PromotionRequest request) {
        promotionConfigValidator.validate(request);
        Promotion promotion = toEntity(request);
        Promotion saved = promotionRepository.save(promotion);
        return ResponseEntity.ok(ApiResponse.<PromotionResponse>builder()
                .success(true)
                .message("Promotion created successfully")
                .data(toResponse(saved))
                .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PromotionResponse>> updatePromotion(
            @PathVariable Long id, 
            @Valid @RequestBody PromotionRequest request) {
            
        Promotion existing = promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Promotion not found"));

        promotionConfigValidator.validate(request);
        updateEntity(existing, request);
        Promotion saved = promotionRepository.save(existing);
        
        return ResponseEntity.ok(ApiResponse.<PromotionResponse>builder()
                .success(true)
                .message("Promotion updated successfully")
                .data(toResponse(saved))
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePromotion(@PathVariable Long id) {
        if (!promotionRepository.existsById(id)) {
            throw new ResourceNotFoundException("Promotion not found");
        }
        promotionRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Promotion deleted successfully")
                .build());
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Void>> toggleStatus(
            @PathVariable Long id, 
            @RequestParam boolean active) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Promotion not found"));
                
        promotion.setActive(active);
        promotionRepository.save(promotion);
        
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Promotion status updated")
                .build());
    }

    private PromotionResponse toResponse(Promotion promo) {
        return promotionResponseMapper.toResponse(promo);
    }

    private Promotion toEntity(PromotionRequest request) {
        return Promotion.builder()
                .name(request.getName())
                .description(request.getDescription())
                .code(request.getCode())
                .promotionType(request.getPromotionType())
                .discountType(request.getDiscountType())
                .discountValue(request.getDiscountValue())
                .minCartValue(request.getMinCartValue())
                .maxDiscountValue(request.getMaxDiscountValue())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .usageLimit(request.getUsageLimit())
                .perUserLimit(request.getPerUserLimit())
                .priority(request.getPriority())
                .active(request.isActive())
                .stackable(request.isStackable())
                .configuration(request.getConfiguration())
                .build();
    }

    private void updateEntity(Promotion existing, PromotionRequest request) {
        existing.setName(request.getName());
        existing.setDescription(request.getDescription());
        existing.setCode(request.getCode());
        existing.setPromotionType(request.getPromotionType());
        existing.setDiscountType(request.getDiscountType());
        existing.setDiscountValue(request.getDiscountValue());
        existing.setMinCartValue(request.getMinCartValue());
        existing.setMaxDiscountValue(request.getMaxDiscountValue());
        existing.setStartDate(request.getStartDate());
        existing.setEndDate(request.getEndDate());
        existing.setUsageLimit(request.getUsageLimit());
        existing.setPerUserLimit(request.getPerUserLimit());
        existing.setPriority(request.getPriority());
        existing.setActive(request.isActive());
        existing.setStackable(request.isStackable());
        existing.setConfiguration(request.getConfiguration());
    }
}
