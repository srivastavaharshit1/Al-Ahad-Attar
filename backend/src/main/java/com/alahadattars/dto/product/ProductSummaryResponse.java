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
public class ProductSummaryResponse {
    private Long id;
    private String name;
    private String slug;
    private String brand;
    private boolean featured;
    private boolean featuredInCollection;
    private com.alahadattars.enums.Gender gender;
    private String categoryName;
    private String subcategory;
    private BigDecimal minimumPrice;
    private String thumbnail;
    private Integer totalStock;
    private Long defaultVariantId;
    private String defaultVariantSize;
    private java.util.List<String> availableSizes;
    private Double averageRating;
    private Integer reviewCount;
}
