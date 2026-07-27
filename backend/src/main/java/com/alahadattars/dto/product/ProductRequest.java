package com.alahadattars.dto.product;

import com.alahadattars.enums.Gender;
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
public class ProductRequest {

    @NotBlank(message = "Product name is required")
    @Schema(description = "Name of the product", example = "Oud Royale")
    private String name;

    @NotBlank(message = "Slug is required")
    @Schema(description = "URL friendly slug", example = "oud-royale")
    private String slug;

    @NotBlank(message = "Short description is required")
    @Schema(description = "Brief product summary", example = "A majestic blend of pure oud")
    private String shortDescription;

    @NotBlank(message = "Description is required")
    @Schema(description = "Detailed product description", example = "Experience the luxury of true aged oud...")
    private String description;

    @NotBlank(message = "Brand is required")
    @Schema(description = "Brand name", example = "Al Ahad")
    private String brand;

    @Schema(description = "Subcategory (e.g., Fresheners for Bakhoor)", example = "Fresheners")
    private String subcategory;

    @NotBlank(message = "Fragrance family is required")
    @Schema(description = "Fragrance family classification", example = "Woody Oriental")
    private String fragranceFamily;

    @NotBlank(message = "Top notes are required")
    @Schema(description = "Top notes of the fragrance", example = "Saffron, Rose")
    private String topNotes;

    @NotBlank(message = "Middle notes are required")
    @Schema(description = "Heart/middle notes", example = "Oud, Amber")
    private String middleNotes;

    @NotBlank(message = "Base notes are required")
    @Schema(description = "Base notes", example = "Sandalwood, Musk")
    private String baseNotes;

    @NotBlank(message = "Longevity is required")
    @Schema(description = "Expected longevity", example = "12+ Hours")
    private String longevity;

    @NotBlank(message = "Projection is required")
    @Schema(description = "Sillage / projection", example = "Strong")
    private String projection;

    @NotNull(message = "Gender is required")
    @Schema(description = "Target gender", example = "UNISEX")
    private Gender gender;

    @Builder.Default
    @Schema(description = "Is this a featured product?", example = "true")
    private boolean featured = false;

    @Builder.Default
    @Schema(description = "Should this product be featured in the Collections page?", example = "true")
    private boolean featuredInCollection = false;

    @Builder.Default
    @Schema(description = "Active status", example = "true")
    private boolean active = true;

    @NotNull(message = "Category ID is required")
    @Schema(description = "ID of the associated category", example = "1")
    private Long categoryId;
}
