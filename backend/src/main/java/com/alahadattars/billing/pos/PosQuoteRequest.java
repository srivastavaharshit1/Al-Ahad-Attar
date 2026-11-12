package com.alahadattars.billing.pos;

import com.alahadattars.billing.discount.DiscountScope;
import com.alahadattars.billing.discount.DiscountType;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

/** Client intent for a stateless quote. Prices and totals are intentionally not part of the contract. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PosQuoteRequest(
        @NotEmpty(message = "At least one POS item is required")
        @Size(max = 50, message = "A POS quote may contain at most 50 lines")
        List<@NotNull @Valid Line> lines,
        @Size(max = 100, message = "Coupon code is too long")
        String couponCode,
        @Size(max = 50, message = "Too many manual discount requests")
        List<@NotNull @Valid ManualDiscount> manualDiscounts,
        @Size(max = 20, message = "Too many free reward selections")
        List<@NotNull @Valid FreeReward> freeRewards,
        @Size(max = 160, message = "Customer name is too long")
        String customerName,
        @Size(max = 25, message = "Customer mobile is too long")
        @Pattern(regexp = "^[+0-9(). -]{7,25}$", message = "Customer mobile is invalid")
        String customerMobile,
        @Email(message = "Customer email is invalid")
        @Size(max = 254, message = "Customer email is too long")
        String customerEmail) {

    public PosQuoteRequest(List<Line> lines, String couponCode, List<ManualDiscount> manualDiscounts,
                           String customerName, String customerMobile, String customerEmail) {
        this(lines, couponCode, manualDiscounts, List.of(), customerName, customerMobile, customerEmail);
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Line(
            @NotBlank(message = "Line key is required")
            @Size(max = 64, message = "Line key is too long")
            @Pattern(regexp = "^[A-Za-z0-9_-]{1,64}$", message = "Line key has an invalid format")
            String lineKey,
            @NotNull(message = "Product is required") @Positive(message = "Product ID must be positive")
            Long productId,
            @NotNull(message = "Variant is required") @Positive(message = "Variant ID must be positive")
            Long variantId,
            @Positive(message = "Bottle ID must be positive")
            Long bottleId,
            @NotNull(message = "Quantity is required") @Min(value = 1, message = "Quantity must be at least 1")
            @Max(value = 999, message = "Quantity cannot exceed 999")
            Integer quantity) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ManualDiscount(
            @NotNull(message = "Discount scope is required") DiscountScope scope,
            @NotNull(message = "Discount type is required") DiscountType type,
            @NotNull(message = "Discount value is required")
            @DecimalMin(value = "0.01", message = "Discount value must be positive")
            @Digits(integer = 10, fraction = 2, message = "Discount value supports at most two decimal places")
            BigDecimal value,
            @Size(max = 64, message = "Discount line key is too long")
            @Pattern(regexp = "^[A-Za-z0-9_-]{1,64}$", message = "Discount line key has an invalid format")
            String lineKey,
            @NotBlank(message = "Discount reason is required")
            @Size(max = 1000, message = "Discount reason is too long")
            String reason) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record FreeReward(
            @NotNull(message = "Free reward promotion is required") @Positive(message = "Promotion ID must be positive")
            Long promotionId,
            @NotNull(message = "Free reward variant is required") @Positive(message = "Variant ID must be positive")
            Long variantId) {
    }
}
