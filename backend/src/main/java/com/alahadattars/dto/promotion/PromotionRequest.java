package com.alahadattars.dto.promotion;

import com.alahadattars.entity.PromotionConfiguration;
import com.alahadattars.enums.DiscountType;
import com.alahadattars.enums.PromotionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class PromotionRequest {
    
    @NotBlank
    private String name;
    
    private String description;
    
    private String code;
    
    @NotNull
    private PromotionType promotionType;
    
    @NotNull
    private DiscountType discountType;
    
    private BigDecimal discountValue;
    private BigDecimal minCartValue;
    private BigDecimal maxDiscountValue;
    
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    
    private Integer usageLimit;
    private Integer perUserLimit;
    
    @NotNull
    private Integer priority;
    
    @Builder.Default
    private boolean active = true;
    
    @Builder.Default
    private boolean stackable = false;
    
    private PromotionConfiguration configuration;
}
