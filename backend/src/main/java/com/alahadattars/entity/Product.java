package com.alahadattars.entity;

import com.alahadattars.enums.Gender;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.CollectionTable;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.HashSet;

/**
 * Represents a master product entity (e.g., "Oud Royale").
 * Contains core product details and associations to its specific variants (sizes, prices).
 */
@Entity
@Table(
    name = "product",
    indexes = {
        @Index(name = "idx_product_slug", columnList = "slug"),
        @Index(name = "idx_product_brand", columnList = "brand"),
        @Index(name = "idx_product_category_id", columnList = "category_id"),
        @Index(name = "idx_product_featured", columnList = "featured"),
        @Index(name = "idx_product_active", columnList = "active")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class Product extends BaseEntity {

    @NotBlank
    @Column(length = 120, nullable = false)
    private String name;

    @NotBlank
    @Column(length = 180, nullable = false, unique = true)
    private String slug;

    @NotBlank
    @Column(name = "short_description", length = 500, nullable = false)
    private String shortDescription;

    @NotBlank
    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @NotBlank
    @Column(length = 100, nullable = false)
    private String brand;

    @Column(length = 100)
    private String subcategory;

    @NotBlank
    @Column(name = "fragrance_family", nullable = false)
    private String fragranceFamily;

    @NotBlank
    @Column(name = "top_notes", nullable = false)
    private String topNotes;

    @NotBlank
    @Column(name = "middle_notes", nullable = false)
    private String middleNotes;

    @NotBlank
    @Column(name = "base_notes", nullable = false)
    private String baseNotes;

    @NotBlank
    @Column(nullable = false)
    private String longevity;

    @NotBlank
    @Column(nullable = false)
    private String projection;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(length = 50, nullable = false)
    private Gender gender;

    @Column(nullable = false)
    @Builder.Default
    private boolean featured = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "average_rating", nullable = false)
    @Builder.Default
    private Double averageRating = 0.0;

    @Column(name = "review_count", nullable = false)
    @Builder.Default
    private Integer reviewCount = 0;

    @org.hibernate.annotations.Formula("(SELECT COALESCE(MIN(v.price), 0) FROM product_variant v WHERE v.product_id = id AND v.active = true)")
    private java.math.BigDecimal price;

    @ToString.Exclude
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @ToString.Exclude
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<ProductVariant> variants = new ArrayList<>();

    @ToString.Exclude
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<Review> reviews = new ArrayList<>();

    @ToString.Exclude
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<ProductImage> images = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "product_collections", joinColumns = @JoinColumn(name = "product_id"))
    @Column(name = "collection_name")
    @Builder.Default
    private Set<String> collections = new HashSet<>();

    /**
     * Helper method to add a variant and synchronize the bidirectional relationship.
     * @param variant The variant to add
     */
    public void addVariant(ProductVariant variant) {
        variants.add(variant);
        variant.setProduct(this);
    }

    /**
     * Helper method to remove a variant and synchronize the bidirectional relationship.
     * @param variant The variant to remove
     */
    public void removeVariant(ProductVariant variant) {
        variants.remove(variant);
        variant.setProduct(null);
    }

    public void addImage(ProductImage image) {
        images.add(image);
        image.setProduct(this);
    }

    public void removeImage(ProductImage image) {
        images.remove(image);
        image.setProduct(null);
    }
}
