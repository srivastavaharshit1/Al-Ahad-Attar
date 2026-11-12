package com.alahadattars.billing.discount;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Calculates manual discounts only from server-trusted post-promotion balances.
 * It does not resolve product prices, evaluate promotions, or mutate catalog pricing.
 */
@Component
public class ManualDiscountCalculator {
    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final int CURRENCY_SCALE = 2;

    public DiscountCalculation calculate(
            List<DiscountLineBalance> lines,
            List<ManualDiscountRequest> requests) {
        Objects.requireNonNull(lines, "lines are required");
        Objects.requireNonNull(requests, "requests are required");

        Map<String, BigDecimal> balances = new LinkedHashMap<>();
        for (DiscountLineBalance line : lines) {
            if (balances.putIfAbsent(line.lineKey(), money(line.remainingBalance())) != null) {
                throw new IllegalArgumentException("line keys must be unique");
            }
        }

        Set<String> itemTargets = new HashSet<>();
        int saleDiscountCount = 0;
        List<ManualDiscountApplication> applications = new ArrayList<>();
        List<ManualDiscountRequest> saleRequests = new ArrayList<>();

        for (ManualDiscountRequest request : requests) {
            if (request.scope() == DiscountScope.ITEM) {
                if (!itemTargets.add(request.lineKey())) {
                    throw new IllegalArgumentException("only one item discount is allowed per line");
                }
                BigDecimal balance = balances.get(request.lineKey());
                if (balance == null) {
                    throw new IllegalArgumentException("discount target line does not exist");
                }
                BigDecimal applied = calculateAmount(balance, request);
                balances.put(request.lineKey(), balance.subtract(applied));
                applications.add(application(request, applied, balance));
            } else {
                saleDiscountCount++;
                saleRequests.add(request);
            }
        }

        if (saleDiscountCount > 1) {
            throw new IllegalArgumentException("only one sale discount is allowed");
        }

        if (!saleRequests.isEmpty()) {
            ManualDiscountRequest saleRequest = saleRequests.get(0);
            BigDecimal eligibleBalance = money(balances.values().stream()
                    .reduce(BigDecimal.ZERO, BigDecimal::add));
            BigDecimal applied = calculateAmount(eligibleBalance, saleRequest);
            allocateSaleDiscount(balances, applied);
            applications.add(application(saleRequest, applied, eligibleBalance));
        }

        BigDecimal total = money(applications.stream()
                .map(ManualDiscountApplication::appliedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
        if (balances.values().stream().anyMatch(value -> value.signum() < 0)) {
            throw new IllegalStateException("discount calculation produced a negative balance");
        }
        return new DiscountCalculation(balances, applications, total);
    }

    private static BigDecimal calculateAmount(BigDecimal eligibleBalance, ManualDiscountRequest request) {
        BigDecimal amount = request.type() == DiscountType.FIXED
                ? money(request.value())
                : eligibleBalance.multiply(request.value()).divide(HUNDRED, CURRENCY_SCALE, RoundingMode.HALF_UP);
        if (amount.compareTo(eligibleBalance) > 0) {
            throw new IllegalArgumentException("discount cannot exceed the eligible remaining balance");
        }
        return amount;
    }

    private static void allocateSaleDiscount(Map<String, BigDecimal> balances, BigDecimal discount) {
        if (discount.signum() == 0) {
            return;
        }
        BigInteger totalCents = cents(balances.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add));
        if (totalCents.signum() == 0) {
            throw new IllegalArgumentException("sale discount has no positive eligible balance");
        }
        BigInteger discountCents = cents(discount);
        Map<String, BigInteger> allocated = new HashMap<>();
        List<Remainder> remainders = new ArrayList<>();
        BigInteger floorSum = BigInteger.ZERO;
        for (Map.Entry<String, BigDecimal> entry : balances.entrySet()) {
            BigInteger lineCents = cents(entry.getValue());
            if (lineCents.signum() == 0) {
                allocated.put(entry.getKey(), BigInteger.ZERO);
                continue;
            }
            BigInteger[] division = discountCents.multiply(lineCents).divideAndRemainder(totalCents);
            allocated.put(entry.getKey(), division[0]);
            floorSum = floorSum.add(division[0]);
            remainders.add(new Remainder(entry.getKey(), division[1]));
        }

        int residualCents = discountCents.subtract(floorSum).intValueExact();
        remainders.sort(Comparator.comparing(Remainder::remainder).reversed());
        for (int i = 0; i < residualCents; i++) {
            String lineKey = remainders.get(i).lineKey();
            allocated.compute(lineKey, (key, value) -> value.add(BigInteger.ONE));
        }
        for (Map.Entry<String, BigDecimal> entry : balances.entrySet()) {
            BigDecimal deduction = new BigDecimal(allocated.get(entry.getKey()), CURRENCY_SCALE);
            BigDecimal remaining = money(entry.getValue().subtract(deduction));
            if (remaining.signum() < 0) {
                throw new IllegalStateException("sale discount allocation exceeded a line balance");
            }
            entry.setValue(remaining);
        }
    }

    private static ManualDiscountApplication application(ManualDiscountRequest request, BigDecimal amount, BigDecimal base) {
        return new ManualDiscountApplication(
                request.scope(), request.type(), request.value(), amount, money(base), request.lineKey(), request.reason());
    }

    private static BigInteger cents(BigDecimal value) {
        return money(value).movePointRight(CURRENCY_SCALE).toBigIntegerExact();
    }

    private static BigDecimal money(BigDecimal value) {
        return value.setScale(CURRENCY_SCALE, RoundingMode.HALF_UP);
    }

    private record Remainder(String lineKey, BigInteger remainder) { }
}
