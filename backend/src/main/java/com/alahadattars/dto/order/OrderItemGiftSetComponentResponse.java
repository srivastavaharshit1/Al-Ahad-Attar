package com.alahadattars.dto.order;

import com.alahadattars.entity.OrderItemGiftSetComponent;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemGiftSetComponentResponse {
    private Long id;
    private Long giftSetId;
    private Long productId;
    private String productName;
    private Long variantId;
    private String variantSize;
    private String sku;
    private Integer quantityPerSet;
    private Integer totalDeductedQuantity;

    public static OrderItemGiftSetComponentResponse fromEntity(OrderItemGiftSetComponent entity) {
        if (entity == null) {
            return null;
        }
        return OrderItemGiftSetComponentResponse.builder()
                .id(entity.getId())
                .giftSetId(entity.getGiftSetId())
                .productId(entity.getProductId())
                .productName(entity.getProductName())
                .variantId(entity.getVariantId())
                .variantSize(entity.getVariantSize())
                .sku(entity.getSku())
                .quantityPerSet(entity.getQuantityPerSet())
                .totalDeductedQuantity(entity.getTotalDeductedQuantity())
                .build();
    }
}

