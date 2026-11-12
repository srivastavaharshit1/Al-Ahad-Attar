package com.alahadattars.billing.discount;

import java.math.BigDecimal;
import java.util.Objects;

public record ManualDiscountRequest(
        DiscountScope scope,
        DiscountType type,
        BigDecimal value,
        String lineKey,
        String reason) {

    public ManualDiscountRequest {
        Objects.requireNonNull(scope, "scope is required");
        Objects.requireNonNull(type, "type is required");
        Objects.requireNonNull(value, "value is required");
        if (value.signum() <= 0) {
            throw new IllegalArgumentException("discount value must be positive");
        }
        if (value.stripTrailingZeros().scale() > 2) {
            throw new IllegalArgumentException("discount value cannot have more than two decimal places");
        }
        if (type == DiscountType.PERCENT && value.compareTo(new BigDecimal("100")) > 0) {
            throw new IllegalArgumentException("percentage discount cannot exceed 100%");
        }
        if (scope == DiscountScope.ITEM && (lineKey == null || lineKey.isBlank())) {
            throw new IllegalArgumentException("item discount requires a line key");
        }
        if (scope == DiscountScope.SALE && lineKey != null) {
            throw new IllegalArgumentException("sale discount cannot target a line");
        }
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("discount reason is required");
        }
        if (reason.length() > 1000) {
            throw new IllegalArgumentException("discount reason exceeds 1000 characters");
        }
    }
}
