package com.alahadattars.billing.discount;

import java.math.BigDecimal;
import java.util.Objects;

/** A trusted, already-priced line balance after existing promotions have been applied. */
public record DiscountLineBalance(String lineKey, BigDecimal remainingBalance) {
    public DiscountLineBalance {
        if (lineKey == null || lineKey.isBlank()) {
            throw new IllegalArgumentException("lineKey is required");
        }
        Objects.requireNonNull(remainingBalance, "remainingBalance is required");
        if (remainingBalance.signum() < 0) {
            throw new IllegalArgumentException("line balance cannot be negative");
        }
        if (remainingBalance.stripTrailingZeros().scale() > 2) {
            throw new IllegalArgumentException("line balance cannot have fractions of a minor currency unit");
        }
    }
}
