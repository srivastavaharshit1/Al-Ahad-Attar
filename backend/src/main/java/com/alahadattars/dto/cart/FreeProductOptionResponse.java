package com.alahadattars.dto.cart;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Represents one eligible free product option returned from the Promotion Engine.
 * Included in CartResponse.freeProductOptions.
 *
 * The frontend renders this list as-is — zero eligibility logic on the client.
 * Price is always 0. The customer selects one and the backend validates the choice.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FreeProductOptionResponse {

    /** ID of the FREE_PRODUCT Promotion that grants this option. */
    private Long promotionId;

    private Long productId;
    private Long variantId;
    private String productName;

    /** Variant size label, e.g. "3 ml" */
    private String variant;

    /** Always BigDecimal.ZERO — free items cost nothing. */
    @Builder.Default
    private BigDecimal price = BigDecimal.ZERO;

    /** Human-readable promotion name, e.g. "Buy 12 ml Get 3 ml Free" */
    private String promotion;

    /** Image URL for display */
    private String image;

    /** Category name for display */
    private String categoryName;
}
