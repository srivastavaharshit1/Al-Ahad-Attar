package com.alahadattars.dto.promotion;

import com.alahadattars.entity.PromotionConfiguration;
import com.alahadattars.enums.DiscountType;
import com.alahadattars.enums.PromotionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromotionResponse {
    
    private Long id;
    private String name;
    private String description;
    private String code;
    private PromotionType promotionType;
    private DiscountType discountType;
    private BigDecimal discountValue;
    private BigDecimal minCartValue;
    private BigDecimal maxDiscountValue;
    
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    
    private Integer usageLimit;
    private Integer usedCount;
    private Integer perUserLimit;
    private Integer priority;
    
    private boolean active;
    private boolean stackable;
    
    private PromotionConfiguration configuration;

    public static PromotionResponse fromEntity(com.alahadattars.entity.Promotion promo) {
        if (promo == null) return null;
        return PromotionResponse.builder()
                .id(promo.getId())
                .name(promo.getName())
                .description(promo.getDescription())
                .code(promo.getCode())
                .promotionType(promo.getPromotionType())
                .discountType(promo.getDiscountType())
                .discountValue(promo.getDiscountValue())
                .minCartValue(promo.getMinCartValue())
                .maxDiscountValue(promo.getMaxDiscountValue())
                .startDate(promo.getStartDate())
                .endDate(promo.getEndDate())
                .usageLimit(promo.getUsageLimit())
                .usedCount(promo.getUsedCount())
                .perUserLimit(promo.getPerUserLimit())
                .priority(promo.getPriority())
                .active(promo.isActive())
                .stackable(promo.isStackable())
                .configuration(promo.getConfiguration())
                .build();
    }
}
