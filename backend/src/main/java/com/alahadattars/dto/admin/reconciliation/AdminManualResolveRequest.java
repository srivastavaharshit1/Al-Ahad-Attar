package com.alahadattars.dto.admin.reconciliation;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Request payload for manually resolving an orphaned payment reconciliation.
 * Enforces mandatory evidence and exact amount/currency verification.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminManualResolveRequest {

    @NotBlank(message = "Razorpay refund/settlement reference is required")
    @Size(min = 5, max = 100, message = "Reference must be between 5 and 100 characters")
    private String gatewayReference;

    @NotNull(message = "Settled amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    private BigDecimal settledAmount;

    @NotBlank(message = "Currency is required")
    @Pattern(regexp = "INR", message = "Currency must be INR")
    private String currency;

    @NotBlank(message = "Audit notes explaining the resolution are mandatory")
    @Size(min = 10, max = 1000, message = "Audit notes must be between 10 and 1000 characters")
    private String auditNotes;

    @NotBlank(message = "Supporting evidence (URL/reference) or explicit reason why unavailable is required")
    @Size(min = 5, max = 500, message = "Supporting evidence must be between 5 and 500 characters")
    private String supportingEvidenceOrReason;
}

