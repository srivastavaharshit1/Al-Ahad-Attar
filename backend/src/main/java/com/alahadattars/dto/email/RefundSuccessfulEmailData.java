package com.alahadattars.dto.email;

import java.math.BigDecimal;

/** razorpayRefundId may be null if the gateway didn't return one even on a "success" response. */
public record RefundSuccessfulEmailData(
        String customerEmail,
        String customerName,
        String orderNumber,
        BigDecimal refundAmount,
        String razorpayRefundId,
        String refundDate
) {
}
