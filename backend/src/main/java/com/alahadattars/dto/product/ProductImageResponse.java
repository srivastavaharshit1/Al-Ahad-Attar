package com.alahadattars.dto.product;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductImageResponse {
    private Long id;
    private String imageUrl;
    private Integer displayOrder;
    private boolean isPrimary;
    private String altText;
    private Integer width;
    private Integer height;
    private String format;
}
