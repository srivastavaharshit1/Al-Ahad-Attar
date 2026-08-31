package com.alahadattars.dto.product;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkPricingPreviewItem {
    private String productName;
    private String variantSize;
    private BigDecimal oldPrice;
    private BigDecimal newPrice;
}
