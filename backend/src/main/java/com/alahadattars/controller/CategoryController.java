package com.alahadattars.controller;

import com.alahadattars.dto.category.CategoryRequest;
import com.alahadattars.dto.category.CategoryResponse;
import com.alahadattars.response.ApiResponse;
import com.alahadattars.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;

@Slf4j
@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@Tag(name = "Category Management", description = "APIs for managing categories")
public class CategoryController {

    private final CategoryService categoryService;
    private final com.alahadattars.repository.CategoryRepository categoryRepository;

    @Operation(summary = "Create a new category (ADMIN)")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(value = {"categories", "homepage"}, allEntries = true)
    public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(
            @Valid @RequestBody CategoryRequest request) {
        log.info("Creating new category: {}", request.getName());
        CategoryResponse response = categoryService.createCategory(request);
        return ResponseEntity.ok(ApiResponse.<CategoryResponse>builder()
                .success(true)
                .message("Category created successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Update an existing category (ADMIN)")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(value = {"categories", "homepage"}, allEntries = true)
    public ResponseEntity<ApiResponse<CategoryResponse>> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody CategoryRequest request) {
        log.info("Updating category ID: {}", id);
        CategoryResponse response = categoryService.updateCategory(id, request);
        return ResponseEntity.ok(ApiResponse.<CategoryResponse>builder()
                .success(true)
                .message("Category updated successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Delete a category (ADMIN)")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(value = {"categories", "homepage"}, allEntries = true)
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable Long id) {
        log.info("Deleting category ID: {}", id);
        categoryService.deleteCategory(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Category deleted successfully")
                .build());
    }

    @Operation(summary = "Get a category by ID")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryResponse>> getCategoryById(@PathVariable Long id) {
        log.info("Fetching category ID: {}", id);
        CategoryResponse response = categoryService.getCategoryById(id);
        return ResponseEntity.ok(ApiResponse.<CategoryResponse>builder()
                .success(true)
                .message("Category retrieved successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Get all active categories")
    @GetMapping("/active")
    @Cacheable("categories")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getActiveCategories() {
        log.info("Fetching all active categories");
        List<CategoryResponse> response = categoryService.getActiveCategories();
        return ResponseEntity.ok(ApiResponse.<List<CategoryResponse>>builder()
                .success(true)
                .message("Active categories retrieved successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Get all categories (ADMIN)")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<org.springframework.data.domain.Page<CategoryResponse>>> getAllCategories(
            @org.springframework.data.web.PageableDefault(size = 10, page = 0, sort = "createdAt", direction = org.springframework.data.domain.Sort.Direction.DESC) 
            org.springframework.data.domain.Pageable pageable) {
        log.info("Fetching all categories with pagination");
        org.springframework.data.domain.Page<CategoryResponse> response = categoryService.getAllCategories(pageable);
        return ResponseEntity.ok(ApiResponse.<org.springframework.data.domain.Page<CategoryResponse>>builder()
                .success(true)
                .message("Categories retrieved successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Upload desktop image for category (ADMIN)")
    @PostMapping(value = "/{id}/desktop-image", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(value = {"categories", "homepage"}, allEntries = true)
    public ResponseEntity<ApiResponse<CategoryResponse>> uploadDesktopImage(
            @PathVariable Long id,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        log.info("Uploading desktop image for category ID: {}", id);
        CategoryResponse response = categoryService.uploadDesktopImage(id, file);
        return ResponseEntity.ok(ApiResponse.<CategoryResponse>builder()
                .success(true)
                .message("Desktop image uploaded successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Upload mobile image for category (ADMIN)")
    @PostMapping(value = "/{id}/mobile-image", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(value = {"categories", "homepage"}, allEntries = true)
    public ResponseEntity<ApiResponse<CategoryResponse>> uploadMobileImage(
            @PathVariable Long id,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        log.info("Uploading mobile image for category ID: {}", id);
        CategoryResponse response = categoryService.uploadMobileImage(id, file);
        return ResponseEntity.ok(ApiResponse.<CategoryResponse>builder()
                .success(true)
                .message("Mobile image uploaded successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Upload hover image for category (ADMIN)")
    @PostMapping(value = "/{id}/hover-image", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('ADMIN')")
    @CacheEvict(value = {"categories", "homepage"}, allEntries = true)
    public ResponseEntity<ApiResponse<CategoryResponse>> uploadHoverImage(
            @PathVariable Long id,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        log.info("Uploading hover image for category ID: {}", id);
        CategoryResponse response = categoryService.uploadHoverImage(id, file);
        return ResponseEntity.ok(ApiResponse.<CategoryResponse>builder()
                .success(true)
                .message("Hover image uploaded successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Serve desktop image for category")
    @GetMapping("/{id}/desktop-image")
    public ResponseEntity<?> serveDesktopImage(@PathVariable Long id) {
        com.alahadattars.entity.Category category = categoryRepository.findById(id).orElse(null);
        if (category == null || category.getDesktopImageUrl() == null || category.getDesktopImageUrl().isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return serveFileOrRedirect(category.getDesktopImageUrl());
    }

    @Operation(summary = "Serve mobile image for category")
    @GetMapping("/{id}/mobile-image")
    public ResponseEntity<?> serveMobileImage(@PathVariable Long id) {
        com.alahadattars.entity.Category category = categoryRepository.findById(id).orElse(null);
        if (category == null || category.getMobileImageUrl() == null || category.getMobileImageUrl().isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return serveFileOrRedirect(category.getMobileImageUrl());
    }

    @Operation(summary = "Serve hover image for category")
    @GetMapping("/{id}/hover-image")
    public ResponseEntity<?> serveHoverImage(@PathVariable Long id) {
        com.alahadattars.entity.Category category = categoryRepository.findById(id).orElse(null);
        if (category == null || category.getHoverImageUrl() == null || category.getHoverImageUrl().isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return serveFileOrRedirect(category.getHoverImageUrl());
    }

    private ResponseEntity<?> serveFileOrRedirect(String url) {
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return ResponseEntity.status(302).location(java.net.URI.create(url)).build();
        }
        return serveFile(url);
    }

    private ResponseEntity<org.springframework.core.io.Resource> serveFile(String filePath) {
        try {
            java.nio.file.Path path = java.nio.file.Paths.get(filePath);
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(path.toUri());

            if (resource.exists() && resource.isReadable()) {
                String contentType = "image/png";
                String lowerPath = filePath.toLowerCase();
                if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) {
                    contentType = "image/jpeg";
                } else if (lowerPath.endsWith(".webp")) {
                    contentType = "image/webp";
                } else if (lowerPath.endsWith(".gif")) {
                    contentType = "image/gif";
                }
                // Deliberately no .svg mapping — see LocalStorageService for why SVG is rejected outright.

                return ResponseEntity.ok()
                        .contentType(org.springframework.http.MediaType.parseMediaType(contentType))
                        .body(resource);
            }
        } catch (java.net.MalformedURLException e) {
            log.error("Malformed URL for image: {}", filePath, e);
        }
        return ResponseEntity.notFound().build();
    }
}
