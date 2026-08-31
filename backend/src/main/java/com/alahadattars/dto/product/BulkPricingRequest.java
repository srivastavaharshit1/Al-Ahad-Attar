package com.alahadattars.dto.product;

import com.alahadattars.enums.BulkPricingOperation;
import com.alahadattars.enums.BulkPricingScope;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkPricingRequest {

    @NotNull(message = "Scope is required")
    private BulkPricingScope scope;

    // Optional depending on scope
    private Long categoryId;

    // Optional filter by subcategory
    private String subcategory;

    @NotNull(message = "Operation is required")
    private BulkPricingOperation operation;

    // Optional filter by variant size (e.g. "6ml", "12ml")
    private String size;

    @NotNull(message = "Type is required")
    private com.alahadattars.enums.BulkPricingType type;

    @NotNull(message = "Value is required")
    @Positive(message = "Value must be greater than 0")
    private BigDecimal value;

    // Optional filter by ProductType (ATTAR or PERFUME) within the category
    private com.alahadattars.enums.ProductType productTypeFilter;

    private String idempotencyKey;
}
