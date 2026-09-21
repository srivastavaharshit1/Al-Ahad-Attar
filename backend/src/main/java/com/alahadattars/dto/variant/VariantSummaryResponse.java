package com.alahadattars.dto.variant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VariantSummaryResponse {
    private Long id;
    private String size;
    private BigDecimal price;
    private boolean inStock;
}
