package com.alahadattars.service;

/** Selects the caller-specific promotion eligibility policy. */
public enum PromotionEvaluationContext {
    /** Existing cart, checkout, and storefront promotion behaviour. */
    STOREFRONT,

    /** POS quotes exclude promotions with a positive per-customer usage limit. */
    POS
}
