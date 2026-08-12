package com.alahadattars.mapper;

import com.alahadattars.dto.category.CategoryRequest;
import com.alahadattars.dto.category.CategoryResponse;
import com.alahadattars.entity.Category;
import com.alahadattars.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CategoryMapper {

    private final StorageService storageService;

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
                .desktopImageUrl(storageService.resolveUrl(category.getDesktopImageUrl(), "/api/categories/" + category.getId() + "/desktop-image"))
                .mobileImageUrl(storageService.resolveUrl(category.getMobileImageUrl(), "/api/categories/" + category.getId() + "/mobile-image"))
                .hoverImageUrl(storageService.resolveUrl(category.getHoverImageUrl(), "/api/categories/" + category.getId() + "/hover-image"))
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
