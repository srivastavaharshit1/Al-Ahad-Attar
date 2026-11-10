package com.alahadattars.dto.giftset;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GiftSetImageResponse {
    private Long id;
    private String imageUrl;
    private Integer displayOrder;
    private boolean isPrimary;
    private String altText;
}

