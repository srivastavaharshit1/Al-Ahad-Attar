package com.alahadattars.dto.email;

import java.math.BigDecimal;

/** Sent to the admin whenever a Razorpay refund attempt (or reconciliation) ends in FAILED, so a stuck refund isn't silently missed. */
public record AdminRefundFailedEmailData(
        String orderNumber,
        String customerName,
        BigDecimal refundAmount,
        String failureReason
) {
}
