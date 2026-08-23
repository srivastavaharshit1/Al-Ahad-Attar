package com.alahadattars.controller;

import com.alahadattars.dto.bottle.BottleRequest;
import com.alahadattars.dto.bottle.BottleResponse;
import com.alahadattars.service.BottleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.alahadattars.service.StorageService;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@RestController
@RequestMapping("/api/bottles")
@RequiredArgsConstructor
public class BottleController {

    private final BottleService bottleService;
    private final StorageService storageService;

    @org.springframework.beans.factory.annotation.Value("${app.upload.dir:uploads}")
    private String baseUploadDir;

    @GetMapping("/public/active")
    public ResponseEntity<List<BottleResponse>> getActiveBottles() {
        return ResponseEntity.ok(bottleService.getActiveBottles());
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<BottleResponse>> getAllBottles() {
        return ResponseEntity.ok(bottleService.getAllBottles());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BottleResponse> getBottleById(@PathVariable Long id) {
        return ResponseEntity.ok(bottleService.getBottleById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BottleResponse> createBottle(@Valid @RequestBody BottleRequest request) {
        return new ResponseEntity<>(bottleService.createBottle(request), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BottleResponse> updateBottle(
            @PathVariable Long id,
            @Valid @RequestBody BottleRequest request) {
        return ResponseEntity.ok(bottleService.updateBottle(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteBottle(@PathVariable Long id) {
        bottleService.deleteBottle(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/upload-image", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> uploadImage(@RequestParam("file") MultipartFile file) {
        String fileName = storageService.uploadFile(file, "bottles");
        return ResponseEntity.ok(fileName);
    }

    @GetMapping("/public/images/{fileName}")
    public ResponseEntity<Resource> serveImage(@PathVariable String fileName) {
        try {
            Path path = Paths.get(baseUploadDir).resolve("bottles").resolve(fileName).toAbsolutePath().normalize();
            Resource resource = new UrlResource(path.toUri());

            if (resource.exists() || resource.isReadable()) {
                String contentType = "image/png"; // Default
                String lowerPath = fileName.toLowerCase();
                if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) {
                    contentType = "image/jpeg";
                } else if (lowerPath.endsWith(".webp")) {
                    contentType = "image/webp";
                } else if (lowerPath.endsWith(".gif")) {
                    contentType = "image/gif";
                }

                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                        .header(HttpHeaders.CONTENT_TYPE, contentType)
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
