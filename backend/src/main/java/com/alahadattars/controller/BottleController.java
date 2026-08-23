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
import com.alahadattars.service.FileStorageService;

import java.util.List;

@RestController
@RequestMapping("/api/bottles")
@RequiredArgsConstructor
public class BottleController {

    private final BottleService bottleService;
    private final FileStorageService fileStorageService;

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

    @PostMapping("/upload-image")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> uploadImage(@RequestParam("file") MultipartFile file) {
        String fileName = fileStorageService.storeFile(file, "bottles");
        return ResponseEntity.ok(fileName);
    }
}
