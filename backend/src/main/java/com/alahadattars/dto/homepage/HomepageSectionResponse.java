package com.alahadattars.dto.homepage;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HomepageSectionResponse {
    private Long id;
    private String sectionKey;
    private String title;
    private String subtitle;
    private String description;
    private boolean visible;
    private int displayOrder;
    private Integer maxItems;
}
