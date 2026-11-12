package com.alahadattars.billing.discount;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ManualDiscountCalculatorTest {
    private final ManualDiscountCalculator calculator = new ManualDiscountCalculator();

    @Test
    void appliesItemDiscountBeforeSaleDiscountAndAllocatesResidualCentsDeterministically() {
        DiscountCalculation result = calculator.calculate(
                List.of(line("a", "9.00"), line("b", "5.00")),
                List.of(
                        discount(DiscountScope.ITEM, DiscountType.PERCENT, "10", "a"),
                        discount(DiscountScope.SALE, DiscountType.PERCENT, "10", null)));

        assertEquals(new BigDecimal("7.29"), result.finalLineBalances().get("a"));
        assertEquals(new BigDecimal("4.50"), result.finalLineBalances().get("b"));
        assertEquals(new BigDecimal("2.21"), result.totalManualDiscount());
    }

    @Test
    void appliesFixedItemDiscountToRemainingBalance() {
        DiscountCalculation result = calculator.calculate(
                List.of(line("a", "250.00")),
                List.of(discount(DiscountScope.ITEM, DiscountType.FIXED, "40.00", "a")));

        assertEquals(new BigDecimal("210.00"), result.finalLineBalances().get("a"));
    }

    @Test
    void acceptsOneHundredPercentAndNeverCreatesNegativeBalance() {
        DiscountCalculation result = calculator.calculate(
                List.of(line("a", "10.00")),
                List.of(discount(DiscountScope.ITEM, DiscountType.PERCENT, "100", "a")));

        assertEquals(new BigDecimal("0.00"), result.finalLineBalances().get("a"));
    }

    @Test
    void rejectsPercentageOverOneHundred() {
        assertThrows(IllegalArgumentException.class,
                () -> discount(DiscountScope.SALE, DiscountType.PERCENT, "100.01", null));
    }

    @Test
    void rejectsFixedDiscountAboveEligibleBalance() {
        assertThrows(IllegalArgumentException.class, () -> calculator.calculate(
                List.of(line("a", "10.00")),
                List.of(discount(DiscountScope.ITEM, DiscountType.FIXED, "10.01", "a"))));
    }

    @Test
    void rejectsMultipleItemDiscountsForSameLine() {
        assertThrows(IllegalArgumentException.class, () -> calculator.calculate(
                List.of(line("a", "10.00")),
                List.of(
                        discount(DiscountScope.ITEM, DiscountType.FIXED, "1.00", "a"),
                        discount(DiscountScope.ITEM, DiscountType.FIXED, "1.00", "a"))));
    }

    @Test
    void rejectsMultipleSaleDiscounts() {
        assertThrows(IllegalArgumentException.class, () -> calculator.calculate(
                List.of(line("a", "10.00")),
                List.of(
                        discount(DiscountScope.SALE, DiscountType.FIXED, "1.00", null),
                        discount(DiscountScope.SALE, DiscountType.PERCENT, "1.00", null))));
    }

    @Test
    void requiresReasonAndValidTarget() {
        assertThrows(IllegalArgumentException.class, () -> new ManualDiscountRequest(
                DiscountScope.ITEM, DiscountType.FIXED, new BigDecimal("1.00"), "a", " "));
        assertThrows(IllegalArgumentException.class, () -> calculator.calculate(
                List.of(line("a", "10.00")),
                List.of(discount(DiscountScope.ITEM, DiscountType.FIXED, "1.00", "missing"))));
    }

    @Test
    void rejectsNegativeAndSubMinorUnitBalances() {
        assertThrows(IllegalArgumentException.class, () -> line("a", "-1.00"));
        assertThrows(IllegalArgumentException.class, () -> line("a", "1.001"));
    }

    private static DiscountLineBalance line(String key, String balance) {
        return new DiscountLineBalance(key, new BigDecimal(balance));
    }

    private static ManualDiscountRequest discount(DiscountScope scope, DiscountType type, String value, String key) {
        return new ManualDiscountRequest(scope, type, new BigDecimal(value), key, "Approved test reason");
    }
}
