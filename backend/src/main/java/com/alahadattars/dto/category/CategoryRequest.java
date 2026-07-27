package com.alahadattars.dto.category;

import com.alahadattars.enums.CategoryType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryRequest {

    @NotBlank(message = "Category name is required")
    @Schema(description = "Name of the category", example = "Oud Collection")
    private String name;

    @NotBlank(message = "Description is required")
    @Schema(description = "Category description", example = "Premium oud fragrances")
    private String description;

    @NotBlank(message = "Image URL/path is required")
    @Schema(description = "Category image URL", example = "/images/oud-category.jpg")
    private String image;

    @NotNull(message = "Category type is required")
    @Schema(description = "Enum type of the category", example = "ATTARS")
    private CategoryType type;

    @Builder.Default
    @Schema(description = "Active status", example = "true")
    private boolean active = true;

    @Schema(description = "Homepage display title", example = "The Attar Collection")
    private String homepageTitle;

    @Schema(description = "Homepage subtitle text", example = "Discover authentic blends")
    private String homepageSubtitle;

    @Schema(description = "Button text for homepage", example = "Explore Collection")
    private String homepageButtonText;

    @Schema(description = "Button URL for homepage", example = "/category/attars")
    private String homepageButtonUrl;

    @Schema(description = "Whether to show on the homepage", example = "true")
    private boolean showOnHomepage;

    @Schema(description = "Order of display on the homepage", example = "1")
    private int homepageDisplayOrder;
}
