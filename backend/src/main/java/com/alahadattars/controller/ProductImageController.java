package com.alahadattars.controller;

import com.alahadattars.dto.product.ProductImageResponse;
import com.alahadattars.entity.ProductImage;
import com.alahadattars.repository.ProductImageRepository;
import com.alahadattars.response.ApiResponse;
import com.alahadattars.service.ProductImageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Product Image Management", description = "Production APIs for managing product images")
public class ProductImageController {

    private final ProductImageService productImageService;
    private final ProductImageRepository productImageRepository;

    @Operation(summary = "Upload an image for a product (ADMIN)")
    @PostMapping(value = "/api/products/{productId}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ProductImageResponse>> uploadImage(
            @PathVariable Long productId,
            @Parameter(description = "The image file (JPEG, PNG, WEBP)", content = @Content(mediaType = MediaType.MULTIPART_FORM_DATA_VALUE))
            @RequestParam("file") MultipartFile file) {
        log.info("Received request to upload image for product ID: {}", productId);
        ProductImageResponse response = productImageService.uploadImage(productId, file);
        return ResponseEntity.ok(ApiResponse.<ProductImageResponse>builder()
                .success(true)
                .message("Image uploaded successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Get all images for a product")
    @GetMapping("/api/products/{productId}/images")
    public ResponseEntity<ApiResponse<List<ProductImageResponse>>> getImagesByProduct(@PathVariable Long productId) {
        log.info("Received request to fetch images for product ID: {}", productId);
        List<ProductImageResponse> response = productImageService.getImagesByProduct(productId);
        return ResponseEntity.ok(ApiResponse.<List<ProductImageResponse>>builder()
                .success(true)
                .message("Images retrieved successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Delete an image (ADMIN)")
    @DeleteMapping("/api/images/{imageId}")
    public ResponseEntity<ApiResponse<Void>> deleteImage(@PathVariable Long imageId) {
        log.info("Received request to delete image ID: {}", imageId);
        productImageService.deleteImage(imageId);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Image deleted successfully")
                .build());
    }

    @Operation(summary = "Set image as Primary (ADMIN)")
    @PatchMapping("/api/images/{imageId}/primary")
    public ResponseEntity<ApiResponse<ProductImageResponse>> setPrimaryImage(@PathVariable Long imageId) {
        log.info("Received request to set image ID: {} as primary", imageId);
        ProductImageResponse response = productImageService.setPrimaryImage(imageId);
        return ResponseEntity.ok(ApiResponse.<ProductImageResponse>builder()
                .success(true)
                .message("Image set as primary successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Update display order of images (ADMIN)")
    @PatchMapping("/api/products/{productId}/images/reorder")
    public ResponseEntity<ApiResponse<List<ProductImageResponse>>> updateDisplayOrder(
            @PathVariable Long productId,
            @RequestBody List<Long> orderedImageIds) {
        log.info("Received request to reorder images for product ID: {}", productId);
        List<ProductImageResponse> response = productImageService.updateDisplayOrder(productId, orderedImageIds);
        return ResponseEntity.ok(ApiResponse.<List<ProductImageResponse>>builder()
                .success(true)
                .message("Images reordered successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Serve image for a product")
    @GetMapping("/api/images/{imageId}/file")
    public ResponseEntity<Resource> serveImage(@PathVariable Long imageId) {
        ProductImage image = productImageRepository.findById(imageId).orElse(null);
        if (image == null || image.getImageUrl() == null || image.getImageUrl().isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return serveFile(image.getImageUrl());
    }

    @org.springframework.beans.factory.annotation.Value("${app.upload.dir:uploads}")
    private String baseUploadDir;

    private ResponseEntity<Resource> serveFile(String filePath) {
        try {
            Path path = Paths.get(baseUploadDir).resolve(filePath).toAbsolutePath().normalize();
            Resource resource = new UrlResource(path.toUri());

            if (resource.exists() && resource.isReadable()) {
                String contentType = "image/png";
                String lowerPath = filePath.toLowerCase();
                if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) {
                    contentType = "image/jpeg";
                } else if (lowerPath.endsWith(".webp")) {
                    contentType = "image/webp";
                } else if (lowerPath.endsWith(".gif")) {
                    contentType = "image/gif";
                } else if (lowerPath.endsWith(".svg")) {
                    contentType = "image/svg+xml";
                }

                return ResponseEntity.ok()
                        .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                        .contentType(MediaType.parseMediaType(contentType))
                        .body(resource);
            } else {
                log.warn("Image file not found or not readable. Path: {}, URI: {}", path, resource.getURI());
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("Error serving image: {}", filePath, e);
            return ResponseEntity.notFound().build();
        }
    }
}
