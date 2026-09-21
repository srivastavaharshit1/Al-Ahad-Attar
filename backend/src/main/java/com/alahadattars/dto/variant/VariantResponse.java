package com.alahadattars.dto.variant;

import com.alahadattars.dto.product.ProductImageResponse;
import com.alahadattars.enums.ProductType;
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
public class VariantResponse {
    private Long id;
    private ProductType productType;
    private String size;
    private BigDecimal price;
    private BigDecimal effectivePrice;
    private Integer stock;
    private String sku;
    private boolean active;
    private Long productId;
    private String productName;
    private List<ProductImageResponse> productImages;
}
