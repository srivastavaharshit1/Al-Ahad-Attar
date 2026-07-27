package com.alahadattars.dto.homepage;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhyChooseUsItemResponse {
    private Long id;
    private String icon;
    private String title;
    private String description;
    private int displayOrder;
    private boolean active;
}
