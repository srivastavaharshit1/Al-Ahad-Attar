package com.alahadattars.controller;

import com.alahadattars.dto.admin.reconciliation.AdminManualResolveRequest;
import com.alahadattars.dto.admin.reconciliation.PaymentReconciliationResponse;
import com.alahadattars.enums.ReconciliationStatus;
import com.alahadattars.response.ApiResponse;
import com.alahadattars.service.PaymentReconciliationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/admin/reconciliations")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Admin Payment Reconciliation", description = "Endpoints for managing orphaned captured payments and manual resolutions")
public class AdminPaymentReconciliationController {

    private final PaymentReconciliationService reconciliationService;

    @GetMapping
    @Operation(summary = "List payment reconciliations with pagination and optional status filter")
    public ResponseEntity<ApiResponse<Page<PaymentReconciliationResponse>>> getReconciliations(
            @RequestParam(required = false) ReconciliationStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<PaymentReconciliationResponse> response = reconciliationService.getReconciliations(status, pageable);
        return ResponseEntity.ok(ApiResponse.<Page<PaymentReconciliationResponse>>builder()
                .success(true)
                .message("Payment reconciliations retrieved successfully")
                .data(response)
                .build());
    }

    @PostMapping("/{id}/retry")
    @Operation(summary = "Trigger a manual reconciliation retry for an orphaned captured payment")
    public ResponseEntity<ApiResponse<PaymentReconciliationResponse>> retryReconciliation(
            @PathVariable Long id,
            Authentication authentication) {

        String adminEmail = authentication != null ? authentication.getName() : "ADMIN";
        PaymentReconciliationResponse response = reconciliationService.retryReconciliation(id, adminEmail);

        return ResponseEntity.ok(ApiResponse.<PaymentReconciliationResponse>builder()
                .success(true)
                .message("Reconciliation retry executed successfully")
                .data(response)
                .build());
    }

    @PostMapping("/{id}/resolve")
    @Operation(summary = "Manually resolve a failed/pending reconciliation with mandatory evidence")
    public ResponseEntity<ApiResponse<PaymentReconciliationResponse>> manualResolve(
            @PathVariable Long id,
            @Valid @RequestBody AdminManualResolveRequest request,
            Authentication authentication) {

        String adminEmail = authentication != null ? authentication.getName() : "ADMIN";
        PaymentReconciliationResponse response = reconciliationService.manualResolve(id, request, adminEmail);

        return ResponseEntity.ok(ApiResponse.<PaymentReconciliationResponse>builder()
                .success(true)
                .message("Payment reconciliation marked as manually resolved")
                .data(response)
                .build());
    }
}
