package com.alahadattars.entity;

import com.alahadattars.enums.CategoryType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
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

/**
 * Represents a product category.
 * Groups products under specific types like ATTARS, BAKHOOR, etc.
 */
@Entity
@Table(
    name = "category",
    indexes = {
        @Index(name = "idx_category_type", columnList = "type"),
        @Index(name = "idx_category_active", columnList = "active")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
// Batches lazy-loading of Category proxies (e.g. Product.category across a paged product list)
// into one IN-clause query per page instead of one per product.
@org.hibernate.annotations.BatchSize(size = 20)
public class Category extends BaseEntity {

    @NotBlank
    @Column(length = 120, nullable = false, unique = true)
    private String name;

    @NotBlank
    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @NotBlank
    @Column(nullable = false)
    private String image;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(length = 50, nullable = false)
    private CategoryType type;

    // --- Homepage Display Fields ---

    @Column(name = "desktop_image_url", length = 500)
    private String desktopImageUrl;

    @Column(name = "mobile_image_url", length = 500)
    private String mobileImageUrl;

    @Column(name = "hover_image_url", length = 500)
    private String hoverImageUrl;

    @Column(name = "homepage_title", length = 200)
    private String homepageTitle;

    @Column(name = "homepage_subtitle", length = 200)
    private String homepageSubtitle;

    @Column(name = "homepage_button_text", length = 100)
    private String homepageButtonText;

    @Column(name = "homepage_button_url", length = 500)
    private String homepageButtonUrl;

    @Column(name = "show_on_homepage")
    @Builder.Default
    private Boolean showOnHomepage = false;

    @Column(name = "homepage_display_order")
    @Builder.Default
    private Integer homepageDisplayOrder = 0;

    // No cascade: CategoryServiceImpl.deleteCategory already rejects deleting a category that
    // still has products (ConflictException) — that explicit guard is the real protection.
    // CascadeType.ALL here would additionally cascade-delete every Product (and in turn their
    // variants/reviews/images) if a category were ever removed via repository.delete() directly,
    // bypassing the service guard.
    @ToString.Exclude
    @OneToMany(mappedBy = "category", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Product> products = new ArrayList<>();

    /**
     * Helper method to add a product and synchronize the bidirectional relationship.
     * @param product The product to add
     */
    public void addProduct(Product product) {
        products.add(product);
        product.setCategory(this);
    }

    /**
     * Helper method to remove a product and synchronize the bidirectional relationship.
     * @param product The product to remove
     */
    public void removeProduct(Product product) {
        products.remove(product);
        product.setCategory(null);
    }
}
