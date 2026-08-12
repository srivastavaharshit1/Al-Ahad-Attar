package com.alahadattars.dto.email;

/** Plain snapshot of a shipping address for email rendering — see EmailOrderItem for why. */
public record EmailAddress(
        String fullName,
        String phone,
        String addressLine1,
        String addressLine2,
        String city,
        String state,
        String postalCode,
        String country
) {
}
