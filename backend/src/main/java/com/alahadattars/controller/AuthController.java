package com.alahadattars.controller;

import com.alahadattars.dto.AuthenticationResponse;
import com.alahadattars.dto.LoginRequest;
import com.alahadattars.dto.RegisterRequest;
import com.alahadattars.dto.UserResponse;
import com.alahadattars.response.ApiResponse;
import com.alahadattars.service.AuthenticationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Endpoints for user registration and login")
public class AuthController {

    private final AuthenticationService authenticationService;

    @Operation(summary = "Register a new user")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "User registered successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Validation error"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Email already in use")
    })
    @PostMapping("/register")
    public ResponseEntity<com.alahadattars.response.ApiResponse<AuthenticationResponse>> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        log.info("ENTERING AuthController.register()");
        log.info("Received request to register user with email: {}", request.getEmail());
        log.info("Request body: firstName={}, lastName={}, email={}, phone={}", 
                 request.getFirstName(), request.getLastName(), request.getEmail(), request.getPhone());
        
        try {
            AuthenticationResponse response = authenticationService.register(request);
            log.info("User registered successfully: {}", request.getEmail());
            return ResponseEntity.ok(com.alahadattars.response.ApiResponse.<AuthenticationResponse>builder()
                    .success(true)
                    .message("User registered successfully")
                    .data(response)
                    .build());
        } catch (Exception e) {
            log.error("Exception thrown in authenticationService.register()", e);
            throw e;
        }
    }

    @Operation(summary = "Authenticate user and generate JWT")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "User authenticated successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Invalid credentials")
    })
    @PostMapping("/login")
    public ResponseEntity<com.alahadattars.response.ApiResponse<AuthenticationResponse>> login(
            @Valid @RequestBody LoginRequest request
    ) {
        log.info("Received login request for email: {}", request.getEmail());
        AuthenticationResponse response = authenticationService.login(request);
        log.info("User logged in successfully: {}", request.getEmail());
        return ResponseEntity.ok(com.alahadattars.response.ApiResponse.<AuthenticationResponse>builder()
                .success(true)
                .message("User logged in successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Get current authenticated user profile")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Profile retrieved successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @GetMapping("/me")
    public ResponseEntity<com.alahadattars.response.ApiResponse<UserResponse>> getCurrentUser() {
        log.info("Received request to fetch current authenticated user profile");
        UserResponse response = authenticationService.getCurrentUser();
        log.info("Successfully fetched current user profile for email: {}", response.getEmail());
        return ResponseEntity.ok(com.alahadattars.response.ApiResponse.<UserResponse>builder()
                .success(true)
                .message("Current user retrieved successfully")
                .data(response)
                .build());
    }
}
