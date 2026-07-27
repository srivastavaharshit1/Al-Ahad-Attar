package com.alahadattars.controller;

import com.alahadattars.dto.profile.AddressRequest;
import com.alahadattars.dto.profile.AddressResponse;
import com.alahadattars.response.ApiResponse;
import com.alahadattars.service.AddressService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/addresses")
@RequiredArgsConstructor
@Tag(name = "Customer Addresses", description = "APIs for managing authenticated user's delivery addresses")
public class AddressController {

    private final AddressService addressService;

    @Operation(summary = "Add a new address")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Address added successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Validation error")
    })
    @PostMapping
    public ResponseEntity<ApiResponse<AddressResponse>> addAddress(@Valid @RequestBody AddressRequest request) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info("Adding new address for user: {}", email);
        AddressResponse response = addressService.addAddress(email, request);
        return ResponseEntity.ok(ApiResponse.<AddressResponse>builder()
                .success(true)
                .message("Address added successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Update an existing address")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Address updated successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Address not found or unauthorized")
    })
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AddressResponse>> updateAddress(
            @PathVariable Long id,
            @Valid @RequestBody AddressRequest request) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info("Updating address ID: {} for user: {}", id, email);
        AddressResponse response = addressService.updateAddress(email, id, request);
        return ResponseEntity.ok(ApiResponse.<AddressResponse>builder()
                .success(true)
                .message("Address updated successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Get a specific address by ID")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Address retrieved successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Address not found or unauthorized")
    })
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AddressResponse>> getAddressById(@PathVariable Long id) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info("Fetching address ID: {} for user: {}", id, email);
        AddressResponse response = addressService.getAddressById(email, id);
        return ResponseEntity.ok(ApiResponse.<AddressResponse>builder()
                .success(true)
                .message("Address retrieved successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Get all addresses for current user")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Addresses retrieved successfully")
    })
    @GetMapping
    public ResponseEntity<ApiResponse<List<AddressResponse>>> getUserAddresses() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info("Fetching all addresses for user: {}", email);
        List<AddressResponse> response = addressService.getUserAddresses(email);
        return ResponseEntity.ok(ApiResponse.<List<AddressResponse>>builder()
                .success(true)
                .message("Addresses retrieved successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Delete an address")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Address deleted successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Address not found or unauthorized")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAddress(@PathVariable Long id) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info("Deleting address ID: {} for user: {}", id, email);
        addressService.deleteAddress(email, id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Address deleted successfully")
                .build());
    }

    @Operation(summary = "Set address as default")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Default address updated successfully"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Address not found or unauthorized")
    })
    @PatchMapping("/{id}/default")
    public ResponseEntity<ApiResponse<AddressResponse>> setDefaultAddress(@PathVariable Long id) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info("Setting address ID: {} as default for user: {}", id, email);
        AddressResponse response = addressService.setDefaultAddress(email, id);
        return ResponseEntity.ok(ApiResponse.<AddressResponse>builder()
                .success(true)
                .message("Default address updated successfully")
                .data(response)
                .build());
    }
}
