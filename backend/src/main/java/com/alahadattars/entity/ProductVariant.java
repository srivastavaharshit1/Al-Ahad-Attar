package com.alahadattars.entity;

import com.alahadattars.enums.ProductType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Represents a specific physical variant of a product (e.g., 3ml Attar vs 50ml Perfume).
 * Contains variant-specific pricing, stock, and SKU details.
 */
@Entity
@Table(
    name = "product_variant",
    indexes = {
        @Index(name = "idx_variant_sku", columnList = "sku"),
        @Index(name = "idx_variant_product_id", columnList = "product_id"),
        @Index(name = "idx_variant_product_type", columnList = "product_type"),
        @Index(name = "idx_variant_active", columnList = "active")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class ProductVariant extends BaseEntity {

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "product_type", length = 50, nullable = false)
    private ProductType productType;

    @NotBlank
    @Column(length = 20, nullable = false)
    private String size;

    @NotNull
    @PositiveOrZero
    @Column(precision = 10, scale = 2, nullable = false)
    private BigDecimal price;

    @NotNull
    @PositiveOrZero
    @Column(nullable = false)
    private Integer stock;

    @NotBlank
    @Column(length = 100, nullable = false, unique = true)
    private String sku;

    /**
     * @deprecated Single image on variant is deprecated. Images are now managed at the Product level.
     */
    @Deprecated
    @Column(nullable = true)
    private String image;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @ToString.Exclude
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;
}
