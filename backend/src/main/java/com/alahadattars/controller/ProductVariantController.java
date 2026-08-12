package com.alahadattars.controller;

import com.alahadattars.dto.variant.CreateVariantRequest;
import com.alahadattars.dto.variant.UpdateStatusRequest;
import com.alahadattars.dto.variant.UpdateStockRequest;
import com.alahadattars.dto.variant.UpdateVariantRequest;
import com.alahadattars.dto.variant.VariantResponse;
import com.alahadattars.dto.variant.VariantSummaryResponse;
import com.alahadattars.response.ApiResponse;
import com.alahadattars.service.ProductVariantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Product Variant Management", description = "APIs for managing product variants")
public class ProductVariantController {

    private final ProductVariantService variantService;

    @Operation(summary = "Create a new variant for a product (ADMIN)")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Variant created successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Validation error"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Variant SKU already exists")
    })
    @PostMapping("/api/products/{productId}/variants")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<VariantResponse>> createVariant(
            @PathVariable Long productId,
            @Valid @RequestBody CreateVariantRequest request) {
        log.info("Received request to create variant for product ID: {}", productId);
        VariantResponse response = variantService.createVariant(productId, request);
        log.info("Successfully created variant with ID: {}", response.getId());
        return ResponseEntity.ok(ApiResponse.<VariantResponse>builder()
                .success(true)
                .message("Variant created successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Get all active variants for a product")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Variants retrieved successfully")
    })
    @GetMapping("/api/products/{productId}/variants")
    public ResponseEntity<ApiResponse<List<VariantSummaryResponse>>> getVariantsByProduct(
            @PathVariable Long productId) {
        log.info("Received request to fetch variants for product ID: {}", productId);
        List<VariantSummaryResponse> response = variantService.getVariantsByProduct(productId);
        return ResponseEntity.ok(ApiResponse.<List<VariantSummaryResponse>>builder()
                .success(true)
                .message("Variants retrieved successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Get a specific variant by ID")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Variant retrieved successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Variant not found")
    })
    @GetMapping("/api/variants/{id}")
    public ResponseEntity<ApiResponse<VariantResponse>> getVariantById(@PathVariable Long id) {
        log.info("Received request to fetch variant with ID: {}", id);
        VariantResponse response = variantService.getVariantById(id);
        return ResponseEntity.ok(ApiResponse.<VariantResponse>builder()
                .success(true)
                .message("Variant retrieved successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Update a variant (ADMIN)")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Variant updated successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Variant not found")
    })
    @PutMapping("/api/variants/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<VariantResponse>> updateVariant(
            @PathVariable Long id,
            @Valid @RequestBody UpdateVariantRequest request) {
        log.info("Received request to update variant with ID: {}", id);
        VariantResponse response = variantService.updateVariant(id, request);
        log.info("Successfully updated variant with ID: {}", id);
        return ResponseEntity.ok(ApiResponse.<VariantResponse>builder()
                .success(true)
                .message("Variant updated successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Soft delete a variant (ADMIN)")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Variant deleted successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Variant not found")
    })
    @DeleteMapping("/api/variants/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteVariant(@PathVariable Long id) {
        log.info("Received request to delete variant with ID: {}", id);
        variantService.deleteVariant(id);
        log.info("Successfully deleted variant with ID: {}", id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Variant deleted successfully")
                .build());
    }

    @Operation(summary = "Update variant stock (ADMIN)")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Variant stock updated successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Variant not found")
    })
    @PatchMapping("/api/variants/{id}/stock")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> updateStock(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStockRequest request) {
        log.info("Received request to update stock for variant ID: {}", id);
        variantService.updateStock(id, request.getStock());
        log.info("Successfully updated stock for variant ID: {}", id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Variant stock updated successfully")
                .build());
    }

    @Operation(summary = "Update variant active status (ADMIN)")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Variant status updated successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Variant not found")
    })
    @PatchMapping("/api/variants/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStatusRequest request) {
        log.info("Received request to update status for variant ID: {}", id);
        variantService.updateStatus(id, request.getActive());
        log.info("Successfully updated status for variant ID: {}", id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Variant status updated successfully")
                .build());
    }
}
