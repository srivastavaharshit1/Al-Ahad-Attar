package com.alahadattars.enums;

/**
 * Explicit scope for a FREE_PRODUCT promotion's buy/free rule, replacing the old implicit
 * inference from which of buyCategoryId/buyProductId/buyVariantIds happened to be set.
 */
public enum PromotionScope {
    ANY_PRODUCT,
    CATEGORY,
    SPECIFIC_PRODUCT
}
