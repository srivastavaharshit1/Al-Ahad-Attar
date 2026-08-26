package com.alahadattars.dto.email;

import java.math.BigDecimal;

public record AdminStuckCheckoutEmailData(
        String razorpayPaymentId,
        String razorpayOrderId,
        String customerEmail,
        BigDecimal amount
) {
}
