package com.alahadattars.controller;

import com.alahadattars.dto.giftset.GiftSetImageResponse;
import com.alahadattars.dto.giftset.GiftSetRequest;
import com.alahadattars.dto.giftset.GiftSetResponse;
import com.alahadattars.response.ApiResponse;
import com.alahadattars.service.GiftSetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/admin/gift-sets")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Admin Gift Set Management", description = "Administrative endpoints for curated gift sets")
public class AdminGiftSetController {

    private final GiftSetService giftSetService;

    @Operation(summary = "List all gift sets (Admin, paginated)")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<GiftSetResponse>>> getAllGiftSets(
            @PageableDefault(size = 20, sort = "displayOrder", direction = Sort.Direction.ASC) Pageable pageable) {
        Page<GiftSetResponse> giftSets = giftSetService.getAllGiftSetsAdmin(pageable);
        return ResponseEntity.ok(ApiResponse.<Page<GiftSetResponse>>builder()
                .success(true)
                .message("Gift sets retrieved successfully")
                .data(giftSets)
                .build());
    }

    @Operation(summary = "Get gift set details by ID (Admin)")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<GiftSetResponse>> getGiftSetById(@PathVariable Long id) {
        GiftSetResponse giftSet = giftSetService.getGiftSetByIdAdmin(id);
        return ResponseEntity.ok(ApiResponse.<GiftSetResponse>builder()
                .success(true)
                .message("Gift set retrieved successfully")
                .data(giftSet)
                .build());
    }

    @Operation(summary = "Create a new gift set (Admin)")
    @PostMapping
    public ResponseEntity<ApiResponse<GiftSetResponse>> createGiftSet(
            @Valid @RequestBody GiftSetRequest request) {
        log.info("Admin creating gift set: '{}'", request.getName());
        GiftSetResponse created = giftSetService.createGiftSet(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.<GiftSetResponse>builder()
                .success(true)
                .message("Gift set created successfully")
                .data(created)
                .build());
    }

    @Operation(summary = "Update an existing gift set (Admin)")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<GiftSetResponse>> updateGiftSet(
            @PathVariable Long id,
            @Valid @RequestBody GiftSetRequest request) {
        log.info("Admin updating gift set ID: {}", id);
        GiftSetResponse updated = giftSetService.updateGiftSet(id, request);
        return ResponseEntity.ok(ApiResponse.<GiftSetResponse>builder()
                .success(true)
                .message("Gift set updated successfully")
                .data(updated)
                .build());
    }

    @Operation(summary = "Deactivate/archive a gift set (Admin)")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteGiftSet(@PathVariable Long id) {
        log.info("Admin deleting/deactivating gift set ID: {}", id);
        giftSetService.deleteGiftSet(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Gift set archived successfully")
                .build());
    }

    @Operation(summary = "Toggle active status of a gift set (Admin)")
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<GiftSetResponse>> toggleStatus(
            @PathVariable Long id,
            @RequestParam boolean active) {
        GiftSetResponse updated = giftSetService.toggleStatus(id, active);
        return ResponseEntity.ok(ApiResponse.<GiftSetResponse>builder()
                .success(true)
                .message("Gift set status updated successfully")
                .data(updated)
                .build());
    }

    @Operation(summary = "Upload image for gift set (Admin)")
    @PostMapping(value = "/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<GiftSetImageResponse>> uploadImage(
            @PathVariable Long id,
            @Parameter(description = "Image file (JPEG, PNG, WEBP)", content = @Content(mediaType = MediaType.MULTIPART_FORM_DATA_VALUE))
            @RequestParam("file") MultipartFile file) {
        GiftSetImageResponse response = giftSetService.uploadImage(id, file);
        return ResponseEntity.ok(ApiResponse.<GiftSetImageResponse>builder()
                .success(true)
                .message("Image uploaded successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Delete an image of a gift set (Admin)")
    @DeleteMapping("/images/{imageId}")
    public ResponseEntity<ApiResponse<Void>> deleteImage(@PathVariable Long imageId) {
        giftSetService.deleteImage(imageId);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Image deleted successfully")
                .build());
    }

    @Operation(summary = "Set image as primary for gift set (Admin)")
    @PutMapping("/images/{imageId}/primary")
    public ResponseEntity<ApiResponse<GiftSetImageResponse>> setPrimaryImage(@PathVariable Long imageId) {
        GiftSetImageResponse response = giftSetService.setPrimaryImage(imageId);
        return ResponseEntity.ok(ApiResponse.<GiftSetImageResponse>builder()
                .success(true)
                .message("Primary image updated successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Reorder images for gift set (Admin)")
    @PutMapping("/{id}/images/reorder")
    public ResponseEntity<ApiResponse<List<GiftSetImageResponse>>> reorderImages(
            @PathVariable Long id,
            @RequestBody List<Long> imageIds) {
        List<GiftSetImageResponse> responses = giftSetService.reorderImages(id, imageIds);
        return ResponseEntity.ok(ApiResponse.<List<GiftSetImageResponse>>builder()
                .success(true)
                .message("Images reordered successfully")
                .data(responses)
                .build());
    }
}
