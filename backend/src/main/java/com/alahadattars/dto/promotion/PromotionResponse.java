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

    /**
     * Human-readable qualification/gift summary (e.g. "Buy any 3x 12ml Attar -> get a free 3ml
     * Attar item"), set by PromotionResponseMapper — never populated by fromEntity/toPublicView
     * directly, since generating it requires resolving category/product names via a repository
     * lookup those static factories don't have access to. Null for non-FREE_PRODUCT promotions or
     * when generation isn't wired in for a given call site; consumers should fall back to
     * `description` when this is null.
     */
    private String generatedDescription;

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

    /**
     * Storefront-safe view for anonymous callers.
     *
     * Codes are intentionally included — this store advertises them in the announcement bar and on the
     * offers page. What is withheld is the internal redemption budget (usageLimit, usedCount,
     * perUserLimit) and the ranking weight, none of which the storefront renders and all of which tell
     * an attacker how much headroom is left on a campaign.
     */
    public static PromotionResponse toPublicView(com.alahadattars.entity.Promotion promo) {
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
                .active(promo.isActive())
                .stackable(promo.isStackable())
                .configuration(promo.getConfiguration())
                .build();
    }
}
