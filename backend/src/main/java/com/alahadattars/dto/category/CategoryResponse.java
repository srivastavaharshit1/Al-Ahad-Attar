package com.alahadattars.dto.category;

import com.alahadattars.enums.CategoryType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryResponse {
    private Long id;
    private String name;
    private String description;
    private String image;
    private CategoryType type;
    private boolean active;
    private String desktopImageUrl;
    private String mobileImageUrl;
    private String hoverImageUrl;
    private String homepageTitle;
    private String homepageSubtitle;
    private String homepageButtonText;
    private String homepageButtonUrl;
    private boolean showOnHomepage;
    private int homepageDisplayOrder;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
