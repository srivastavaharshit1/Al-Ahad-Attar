package com.alahadattars.dto.order;

import com.alahadattars.dto.variant.VariantResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemResponse {

    private Long id;
    private VariantResponse variant;
    private Integer quantity;
    private BigDecimal originalPrice;
    private BigDecimal discountAmount;
    private BigDecimal unitPrice;
    private BigDecimal subtotal;
    private String productName;
    private String variantSize;
}
