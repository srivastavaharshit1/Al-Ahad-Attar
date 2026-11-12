package com.alahadattars.billing.sale;

import java.math.BigDecimal;
import java.util.Objects;

/** Financial value object only; no payment capture or sale-finalization operation is provided. */
public record PosTenderSnapshot(
        TenderMethod method,
        BigDecimal salePayable,
        BigDecimal amountReceived,
        BigDecimal changeReturned,
        BigDecimal amountApplied,
        String transactionReference) {

    public PosTenderSnapshot {
        Objects.requireNonNull(method, "tender method is required");
        requireMoney(salePayable, "salePayable");
        requireMoney(amountReceived, "amountReceived");
        requireMoney(changeReturned, "changeReturned");
        requireMoney(amountApplied, "amountApplied");
        if (amountApplied.compareTo(salePayable) != 0) {
            throw new IllegalArgumentException("tender applied must equal sale payable");
        }
        if (method == TenderMethod.CASH) {
            if (amountReceived.subtract(changeReturned).compareTo(amountApplied) != 0) {
                throw new IllegalArgumentException("cash received minus change must equal tender applied");
            }
        } else if (changeReturned.signum() != 0 || amountReceived.compareTo(salePayable) != 0) {
            throw new IllegalArgumentException("UPI/card received amount must equal sale payable with no change");
        }
        if (transactionReference != null && transactionReference.length() > 200) {
            throw new IllegalArgumentException("transaction reference is too long");
        }
    }

    private static void requireMoney(BigDecimal value, String field) {
        if (value == null || value.signum() < 0 || value.stripTrailingZeros().scale() > 2) {
            throw new IllegalArgumentException(field + " must be a nonnegative currency amount with at most two decimals");
        }
    }
}
