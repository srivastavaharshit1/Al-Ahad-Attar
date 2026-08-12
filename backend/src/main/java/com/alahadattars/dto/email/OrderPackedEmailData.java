package com.alahadattars.dto.email;

public record OrderPackedEmailData(
        String customerEmail,
        String customerName,
        String orderNumber
) {
}
