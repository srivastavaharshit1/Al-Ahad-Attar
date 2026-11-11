package com.alahadattars.dto.giftset;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GiftSetItemResponse {
    private Long id;
    private Long productId;
    private String productName;
    private String productSlug;
    private Long variantId;
    private String variantSize;
    private String sku;
    private BigDecimal variantOriginalPrice;
    private Integer quantity;
    private Integer displayOrder;
    private Integer currentVariantStock;
    private String productImage;
}

