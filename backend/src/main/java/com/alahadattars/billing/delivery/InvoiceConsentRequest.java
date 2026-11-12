package com.alahadattars.billing.delivery;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record InvoiceConsentRequest(
        @NotNull InvoiceDeliveryChannel channel,
        String destination,
        @NotNull InvoiceConsentStatus status,
        @NotBlank String wordingVersion) {
}
