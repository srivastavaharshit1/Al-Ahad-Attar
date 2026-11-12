package com.alahadattars.billing.pos;

import com.alahadattars.billing.sale.TenderMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** Client confirmation and single-tender input; all sale amounts are recalculated by the server. */
public record PosSaleFinalizeRequest(
        @NotNull @Valid PosQuoteRequest quote,
        @NotNull @Valid Tender tender,
        @NotBlank @Pattern(regexp = "^[a-fA-F0-9]{64}$", message = "Quote fingerprint is invalid")
        String confirmedQuoteFingerprint) {

    public record Tender(
            @NotNull TenderMethod method,
            @NotNull @DecimalMin(value = "0.00") @Digits(integer = 10, fraction = 2)
            BigDecimal amountReceived,
            @Size(max = 200) String transactionReference) {
    }
}
