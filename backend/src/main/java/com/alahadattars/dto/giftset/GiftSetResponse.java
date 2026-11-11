package com.alahadattars.dto.giftset;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GiftSetResponse {
    private Long id;
    private String name;
    private String slug;
    private String description;
    private BigDecimal price;
    private BigDecimal salePrice;
    private boolean active;
    private boolean featured;
    private String packagingNotes;
    private Integer displayOrder;
    private boolean inStock;
    private Integer availableStock;
    private String primaryImageUrl;
    private List<GiftSetImageResponse> images;
    private List<GiftSetItemResponse> items;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

