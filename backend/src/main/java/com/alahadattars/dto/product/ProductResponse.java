package com.alahadattars.dto.product;

import com.alahadattars.dto.category.CategoryResponse;
import com.alahadattars.dto.variant.VariantResponse;
import com.alahadattars.enums.Gender;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponse {
    private Long id;
    private String name;
    private String slug;
    private String description;
    private String brand;
    private String subcategory;
    private String fragranceFamily;
    private String topNotes;
    private String middleNotes;
    private String baseNotes;
    private String longevity;
    private String projection;
    private Gender gender;
    private boolean featured;
    private boolean featuredInCollection;
    private boolean active;
    private CategoryResponse category;
    private Double averageRating;
    private Integer reviewCount;
    private List<VariantResponse> variants;
    private List<ProductImageResponse> images;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
