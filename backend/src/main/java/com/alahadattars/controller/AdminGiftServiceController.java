package com.alahadattars.controller;

import com.alahadattars.dto.gift.GiftServiceRequest;
import com.alahadattars.dto.gift.GiftServiceResponse;
import com.alahadattars.response.ApiResponse;
import com.alahadattars.service.GiftServiceService;
import com.alahadattars.service.UploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/gift-services")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Gift Services", description = "Admin endpoints for managing premium gift services")
public class AdminGiftServiceController {

    private final GiftServiceService giftServiceService;
    private final UploadService uploadService;

    @Operation(summary = "Get all gift services (paginated, searchable)")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<GiftServiceResponse>>> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "sortOrder") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<GiftServiceResponse> result = giftServiceService.getAll(search, pageable);

        return ResponseEntity.ok(ApiResponse.<Page<GiftServiceResponse>>builder()
                .success(true)
                .message("Gift services retrieved")
                .data(result)
                .build());
    }

    @Operation(summary = "Get a gift service by ID")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<GiftServiceResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.<GiftServiceResponse>builder()
                .success(true)
                .message("Gift service retrieved")
                .data(giftServiceService.getById(id))
                .build());
    }

    @Operation(summary = "Create a new gift service")
    @PostMapping
    public ResponseEntity<ApiResponse<GiftServiceResponse>> create(@Valid @RequestBody GiftServiceRequest request) {
        GiftServiceResponse created = giftServiceService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.<GiftServiceResponse>builder()
                .success(true)
                .message("Gift service created successfully")
                .data(created)
                .build());
    }

    @Operation(summary = "Update an existing gift service")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<GiftServiceResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody GiftServiceRequest request) {

        return ResponseEntity.ok(ApiResponse.<GiftServiceResponse>builder()
                .success(true)
                .message("Gift service updated successfully")
                .data(giftServiceService.update(id, request))
                .build());
    }

    @Operation(summary = "Delete a gift service")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        giftServiceService.delete(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Gift service deleted successfully")
                .build());
    }

    @Operation(summary = "Toggle active/inactive status of a gift service")
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<ApiResponse<GiftServiceResponse>> toggle(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.<GiftServiceResponse>builder()
                .success(true)
                .message("Gift service status toggled")
                .data(giftServiceService.toggleActive(id))
                .build());
    }

    @Operation(summary = "Upload an image for a gift service")
    @PostMapping(value = "/upload-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<String>> uploadImage(@RequestParam("file") MultipartFile file) {
        String path = uploadService.uploadFile(file, "gift-services");
        return ResponseEntity.ok(ApiResponse.<String>builder()
                .success(true)
                .message("Image uploaded successfully")
                .data(path)
                .build());
    }
}
