package com.alahadattars.mapper;

import com.alahadattars.dto.category.CategoryRequest;
import com.alahadattars.dto.category.CategoryResponse;
import com.alahadattars.entity.Category;
import org.springframework.stereotype.Component;

@Component
public class CategoryMapper {

    public CategoryResponse toResponse(Category category) {
        if (category == null) {
            return null;
        }

        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .image(category.getImage())
                .type(category.getType())
                .active(category.isActive())
                .desktopImageUrl(category.getDesktopImageUrl() != null ? "/api/categories/" + category.getId() + "/desktop-image" : null)
                .mobileImageUrl(category.getMobileImageUrl() != null ? "/api/categories/" + category.getId() + "/mobile-image" : null)
                .hoverImageUrl(category.getHoverImageUrl() != null ? "/api/categories/" + category.getId() + "/hover-image" : null)
                .homepageTitle(category.getHomepageTitle())
                .homepageSubtitle(category.getHomepageSubtitle())
                .homepageButtonText(category.getHomepageButtonText())
                .homepageButtonUrl(category.getHomepageButtonUrl())
                .showOnHomepage(category.getShowOnHomepage() != null ? category.getShowOnHomepage() : false)
                .homepageDisplayOrder(category.getHomepageDisplayOrder() != null ? category.getHomepageDisplayOrder() : 0)
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .build();
    }

    public Category toEntity(CategoryRequest request) {
        if (request == null) {
            return null;
        }

        return Category.builder()
                .name(request.getName())
                .description(request.getDescription())
                .image(request.getImage())
                .type(request.getType())
                .active(request.isActive())
                .homepageTitle(request.getHomepageTitle())
                .homepageSubtitle(request.getHomepageSubtitle())
                .homepageButtonText(request.getHomepageButtonText())
                .homepageButtonUrl(request.getHomepageButtonUrl())
                .showOnHomepage(request.isShowOnHomepage())
                .homepageDisplayOrder(request.getHomepageDisplayOrder())
                .build();
    }
}
