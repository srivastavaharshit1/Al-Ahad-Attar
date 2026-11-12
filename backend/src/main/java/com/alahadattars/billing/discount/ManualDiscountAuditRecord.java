package com.alahadattars.billing.discount;

import com.alahadattars.billing.security.AuthenticatedBillingAdmin;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;

/** Immutable Admin-attributed audit snapshot for a discount applied to a sale. */
public record ManualDiscountAuditRecord(
        long saleId,
        Long saleLineId,
        DiscountScope scope,
        DiscountType type,
        BigDecimal requestedValue,
        BigDecimal appliedAmount,
        BigDecimal calculationBase,
        long adminUserId,
        String reason,
        Instant appliedAt) {

    public ManualDiscountAuditRecord {
        Objects.requireNonNull(scope, "discount scope is required");
        Objects.requireNonNull(type, "discount type is required");
        Objects.requireNonNull(requestedValue, "requested discount value is required");
        Objects.requireNonNull(appliedAmount, "applied discount amount is required");
        Objects.requireNonNull(calculationBase, "discount calculation base is required");
        Objects.requireNonNull(appliedAt, "application timestamp is required");
        if (saleId <= 0 || adminUserId <= 0) {
            throw new IllegalArgumentException("sale and authenticated Admin IDs must be positive");
        }
        if ((scope == DiscountScope.ITEM && (saleLineId == null || saleLineId <= 0))
                || (scope == DiscountScope.SALE && saleLineId != null)) {
            throw new IllegalArgumentException("discount line target does not match its scope");
        }
        if (requestedValue.signum() <= 0 || appliedAmount.signum() < 0 || calculationBase.signum() < 0
                || appliedAmount.compareTo(calculationBase) > 0) {
            throw new IllegalArgumentException("discount audit amounts are invalid");
        }
        if (type == DiscountType.PERCENT && requestedValue.compareTo(new BigDecimal("100")) > 0) {
            throw new IllegalArgumentException("percentage discount cannot exceed 100%");
        }
        if (reason == null || reason.isBlank() || reason.length() > 1000) {
            throw new IllegalArgumentException("discount audit reason is required and must not exceed 1000 characters");
        }
    }

    public static ManualDiscountAuditRecord fromAuthenticatedAdmin(
            Authentication authentication,
            long saleId,
            Long saleLineId,
            ManualDiscountApplication application,
            Instant appliedAt) {
        Objects.requireNonNull(application, "discount application is required");
        AuthenticatedBillingAdmin actor = AuthenticatedBillingAdmin.from(authentication);
        return new ManualDiscountAuditRecord(
                saleId,
                saleLineId,
                application.scope(),
                application.type(),
                application.requestedValue(),
                application.appliedAmount(),
                application.calculationBase(),
                actor.userId(),
                application.reason(),
                appliedAt);
    }
}
