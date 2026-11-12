package com.alahadattars.billing.delivery;

public record InvoiceConsentPolicy(InvoiceDeliveryChannel channel, String wordingVersion, String wording,
                                   boolean configured) {
}
