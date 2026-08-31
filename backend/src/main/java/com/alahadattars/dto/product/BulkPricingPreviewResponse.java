package com.alahadattars.dto.product;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkPricingPreviewResponse {
    private int productsAffected;
    private BigDecimal currentTotalValue;
    private BigDecimal newTotalValue;
    private List<BulkPricingPreviewItem> examples;
}
