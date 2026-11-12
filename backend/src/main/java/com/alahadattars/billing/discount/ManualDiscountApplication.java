package com.alahadattars.billing.discount;

import java.math.BigDecimal;

public record ManualDiscountApplication(
        DiscountScope scope,
        DiscountType type,
        BigDecimal requestedValue,
        BigDecimal appliedAmount,
        BigDecimal calculationBase,
        String lineKey,
        String reason) {
}
