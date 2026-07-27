package com.alahadattars.dto.variant;

import com.alahadattars.enums.ProductType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VariantResponse {
    private Long id;
    private ProductType productType;
    private String size;
    private BigDecimal price;
    private Integer stock;
    private String sku;
    private String image;
    private boolean active;
    private Long productId;
    private String productName;
}
