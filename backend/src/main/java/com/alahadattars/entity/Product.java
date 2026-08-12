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
// Batches lazy-loading of Product proxies (e.g. ProductVariant.product across a paged order/
// variant list) into one IN-clause query per page instead of one per row.
@org.hibernate.annotations.BatchSize(size = 20)
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

    // Brand, fragrance pyramid, longevity and projection are admin-facing "advanced details" —
    // optional by design (not every product has notes/projection data on hand at listing time).
    // nullable stays false since the form always submits an actual string (possibly empty ""),
    // never a missing/null field, so NOT NULL is never actually violated.
    @Column(length = 100, nullable = false)
    private String brand;

    @Column(length = 100)
    private String subcategory;

    @Column(name = "fragrance_family", nullable = false)
    private String fragranceFamily;

    @Column(name = "top_notes", nullable = false)
    private String topNotes;

    @Column(name = "middle_notes", nullable = false)
    private String middleNotes;

    @Column(name = "base_notes", nullable = false)
    private String baseNotes;

    @Column(nullable = false)
    private String longevity;

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
    // Batches loading across a page of products into ~1 query per page instead of 1 per product
    // (N+1) — product listing endpoints page through products without a fetch join.
    // Sized above the storefront's page size (24, see Collection.tsx/Search.tsx) so one page needs
    // exactly one batch query per association instead of splitting into two round trips.
    @org.hibernate.annotations.BatchSize(size = 32)
    @Builder.Default
    private List<ProductVariant> variants = new ArrayList<>();

    @ToString.Exclude
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<Review> reviews = new ArrayList<>();

    @ToString.Exclude
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @org.hibernate.annotations.BatchSize(size = 32)
    @Builder.Default
    private List<ProductImage> images = new ArrayList<>();

    // EAGER (kept — every consumer of Product reads this immediately, so LAZY would just move the
    // same query to a different, less predictable place) but batched: without @BatchSize, Hibernate
    // issues one separate product_collections query PER PRODUCT the instant each Product loads —
    // 11 products loaded == 11 sequential round trips just for this one field. This was confirmed
    // as 11 of the 21 sequential queries behind the ~9s /api/homepage response time (see
    // PRODUCTION_AUDIT_REPORT.md's timeout investigation). Batching collapses all of them into one
    // query, matching the pattern already used for Product.variants/images.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "product_collections", joinColumns = @JoinColumn(name = "product_id"))
    @org.hibernate.annotations.BatchSize(size = 32)
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
