package com.alahadattars.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.io.Serializable;
import java.util.List;

/**
 * JSON-persisted configuration blob for a Promotion.
 * Different promotion types use different subsets of fields.
 * Unused fields are null/false and ignored by the engine.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PromotionConfiguration implements Serializable {

    // ─── PRODUCT_DISCOUNT / CATEGORY_DISCOUNT ────────────────────────────────

    /** Category IDs to which this promotion applies. */
    private List<Long> applicableCategoryIds;

    /** Product IDs to which this promotion applies. */
    private List<Long> applicableProductIds;

    // ─── FIRST_ORDER ─────────────────────────────────────────────────────────

    /** If true, this promotion only applies to customers with zero prior orders. */
    @Builder.Default
    private boolean firstOrderOnly = false;



    // ─── FREE_PRODUCT ─────────────────────────────────────────────────────────
    // These fields are ONLY evaluated when promotionType = FREE_PRODUCT.
    // They are null/false for all other promotion types.

    // --- Buy Qualification ---

    /**
     * The variant size that triggers eligibility (e.g. "12 ml").
     * Matched case-insensitively against CartItem.variant.size.
     * If null, any variant size in the buy category qualifies.
     */
    private String buyVariantSize;

    /**
     * Restrict the trigger to this specific category ID.
     * If null, any category qualifies.
     */
    private Long buyCategoryId;

    /**
     * Restrict the trigger to these specific variant IDs (optional).
     * If null, any variant in buyCategoryId qualifies.
     */
    private List<Long> buyVariantIds;

    /**
     * @deprecated Use buyVariantIds instead.
     */
    @Deprecated
    private Long buyProductId;

    /**
     * Minimum quantity of the qualifying variant the customer must have in the cart.
     * Defaults to 1 when null.
     */
    private Integer minPurchaseQuantity;

    // --- Free Product Configuration ---

    /**
     * Category IDs from which the free item must come.
     * If null or empty, the same category as buyCategoryId is used.
     */
    private List<Long> freeCategoryIds;

    /**
     * Specific product IDs eligible as free items.
     * If null or empty, all products in freeCategoryIds are eligible.
     */
    private List<Long> freeProductIds;

    /**
     * Specific variant IDs eligible as free items.
     * This directly maps to the exact product variant without string matching.
     */
    private List<Long> freeVariantIds;

    /**
     * @deprecated Use freeVariantIds instead.
     */
    @Deprecated
    private String allowedFreeVariantSize;

    /**
     * Maximum number of free items this promotion may grant per cart.
     * Defaults to 1 when null.
     */
    private Integer maxFreeQuantity;

    /**
     * When true, the customer sees a product selection UI.
     * When false, the first eligible product is auto-suggested (but still requires customer action).
     */
    @Builder.Default
    private boolean allowCustomerSelection = true;

    /**
     * When true, the backend automatically adds the free item without any customer interaction.
     * Use with care — only when exactly one eligible product exists.
     */
    @Builder.Default
    private boolean autoAddFreeProduct = false;
}
