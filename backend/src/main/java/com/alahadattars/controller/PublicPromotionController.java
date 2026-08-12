package com.alahadattars.controller;

import com.alahadattars.dto.promotion.PromotionResponse;
import com.alahadattars.entity.Promotion;
import com.alahadattars.repository.PromotionRepository;
import com.alahadattars.response.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/promotions")
@RequiredArgsConstructor
@Tag(name = "Public Promotions", description = "Public APIs for retrieving active promotions")
public class PublicPromotionController {

    private final PromotionRepository promotionRepository;
    private final com.alahadattars.service.impl.PromotionResponseMapper promotionResponseMapper;

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<PromotionResponse>>> getActivePromotions() {
        List<Promotion> activePromotions = promotionRepository.findAllActivePromotions(LocalDateTime.now());

        List<PromotionResponse> responseList = activePromotions.stream()
                .map(promotionResponseMapper::toPublicResponse)
                .collect(Collectors.toList());
                
        return ResponseEntity.ok(ApiResponse.<List<PromotionResponse>>builder()
                .success(true)
                .data(responseList)
                .build());
    }
}
