package com.alahadattars.controller;

import com.alahadattars.dto.StoreSettingsRequest;
import com.alahadattars.dto.StoreSettingsResponse;
import com.alahadattars.entity.StoreSettings;
import com.alahadattars.response.ApiResponse;
import com.alahadattars.service.StoreSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.MalformedURLException;
import java.nio.file.Path;
import java.nio.file.Paths;

@Slf4j
@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
@Tag(name = "Store Settings", description = "APIs for managing global store configuration")
public class StoreSettingsController {

    private final StoreSettingsService storeSettingsService;

    @Operation(summary = "Get current store settings (Public)")
    @GetMapping
    public ResponseEntity<ApiResponse<StoreSettingsResponse>> getSettings() {
        return ResponseEntity.ok(ApiResponse.<StoreSettingsResponse>builder()
                .success(true)
                .data(storeSettingsService.getSettings())
                .build());
    }

    @Operation(summary = "Update store settings (ADMIN)")
    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<StoreSettingsResponse>> updateSettings(@RequestBody StoreSettingsRequest request) {
        return ResponseEntity.ok(ApiResponse.<StoreSettingsResponse>builder()
                .success(true)
                .message("Settings updated successfully")
                .data(storeSettingsService.updateSettings(request))
                .build());
    }

    @Operation(summary = "Upload brand logo (ADMIN)")
    @PostMapping(value = "/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> uploadLogo(@RequestParam("file") MultipartFile file) {
        String logoUrl = storeSettingsService.uploadLogo(file);
        return ResponseEntity.ok(ApiResponse.<String>builder()
                .success(true)
                .message("Logo uploaded successfully")
                .data(logoUrl)
                .build());
    }

    @Operation(summary = "Serve brand logo image (Public)")
    @GetMapping("/logo/content")
    public ResponseEntity<Resource> serveLogo() {
        StoreSettings settings = storeSettingsService.getSettingsEntity();
        return serveImageFile(settings.getLogoFilePath());
    }

    @Operation(summary = "Upload navbar logo (ADMIN)")
    @PostMapping(value = "/logo/navbar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> uploadNavbarLogo(@RequestParam("file") MultipartFile file) {
        String logoUrl = storeSettingsService.uploadNavbarLogo(file);
        return ResponseEntity.ok(ApiResponse.<String>builder()
                .success(true)
                .message("Navbar Logo uploaded successfully")
                .data(logoUrl)
                .build());
    }

    @Operation(summary = "Serve navbar logo image (Public)")
    @GetMapping("/logo/navbar/content")
    public ResponseEntity<Resource> serveNavbarLogo() {
        StoreSettings settings = storeSettingsService.getSettingsEntity();
        return serveImageFile(settings.getNavbarLogoFilePath());
    }

    private ResponseEntity<Resource> serveImageFile(String filePath) {
        if (filePath == null || filePath.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        try {
            Path path = Paths.get(filePath);
            Resource resource = new UrlResource(path.toUri());
            
            if (resource.exists() || resource.isReadable()) {
                String contentType = "image/png"; // Default
                if (filePath.toLowerCase().endsWith(".jpg") || filePath.toLowerCase().endsWith(".jpeg")) {
                    contentType = "image/jpeg";
                } else if (filePath.toLowerCase().endsWith(".webp")) {
                    contentType = "image/webp";
                }
                
                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                        .contentType(MediaType.parseMediaType(contentType))
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (MalformedURLException e) {
            log.error("Error reading logo file", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
