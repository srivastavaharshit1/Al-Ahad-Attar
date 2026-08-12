package com.alahadattars.dto.email;

/** trackingNumber, courierName, and estimatedDelivery may all be null — not every order has them. */
public record OrderShippedEmailData(
        String customerEmail,
        String customerName,
        String orderNumber,
        String trackingNumber,
        String courierName,
        String estimatedDelivery
) {
}
