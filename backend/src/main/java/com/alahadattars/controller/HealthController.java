package com.alahadattars.controller;

import com.alahadattars.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api")
@Tag(name = "Health Check", description = "Endpoint to verify backend status")
public class HealthController {

    @Operation(summary = "Check backend health")
    @GetMapping("/health")
    public ResponseEntity<com.alahadattars.response.ApiResponse<Void>> checkHealth() {
        log.info("Health check endpoint pinged");
        com.alahadattars.response.ApiResponse<Void> response = com.alahadattars.response.ApiResponse.<Void>builder()
                .success(true)
                .message("Backend Running Successfully")
                .build();
        return ResponseEntity.ok(response);
    }
}
