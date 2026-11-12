package com.alahadattars.billing.discount;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public record DiscountCalculation(
        Map<String, BigDecimal> finalLineBalances,
        List<ManualDiscountApplication> applications,
        BigDecimal totalManualDiscount) {

    public DiscountCalculation {
        finalLineBalances = Collections.unmodifiableMap(new LinkedHashMap<>(finalLineBalances));
        applications = List.copyOf(applications);
    }
}
