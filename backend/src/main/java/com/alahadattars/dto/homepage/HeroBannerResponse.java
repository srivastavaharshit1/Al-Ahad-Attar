package com.alahadattars.dto.homepage;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HeroBannerResponse {
    private Long id;
    private String title;
    private String subtitle;
    private String description;
    private String buttonText;
    private String buttonUrl;
    private String badge;
    private String imageUrl;
    private String mobileImageUrl;
    private boolean active;
    private int displayOrder;
}
