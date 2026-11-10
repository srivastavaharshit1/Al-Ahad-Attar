package com.alahadattars.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Immutable historical snapshot of a component inside a purchased Gift Set order item.
 * Preserves the exact variant ID, product ID, name, size, SKU, and deducted quantity
 * at the moment of order creation, completely independent of live catalog foreign keys.
 */
@Entity
@Table(
    name = "order_item_gift_set_component",
    indexes = {
        @Index(name = "idx_oigsc_order_item_id", columnList = "order_item_id"),
        @Index(name = "idx_oigsc_variant_id", columnList = "variant_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class OrderItemGiftSetComponent extends BaseEntity {

    @ToString.Exclude
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_item_id", nullable = false)
    private OrderItem orderItem;

    @Column(name = "gift_set_id")
    private Long giftSetId;

    @NotNull
    @Column(name = "product_id", nullable = false)
    private Long productId;

    @NotBlank
    @Column(name = "product_name", nullable = false)
    private String productName;

    @NotNull
    @Column(name = "variant_id", nullable = false)
    private Long variantId;

    @NotBlank
    @Column(name = "variant_size", nullable = false)
    private String variantSize;

    @Column(name = "sku")
    private String sku;

    @NotNull
    @Min(1)
    @Column(name = "quantity_per_set", nullable = false)
    private Integer quantityPerSet;

    @NotNull
    @Min(1)
    @Column(name = "total_deducted_quantity", nullable = false)
    private Integer totalDeductedQuantity;
}

