package com.alahadattars.dto.email;

import java.math.BigDecimal;

/**
 * refundRequired reflects RefundStatus.REFUND_REQUIRED — the order was paid, so a refund is now
 * awaiting admin action. It does NOT mean the refund has been processed yet (cancellation never
 * calls Razorpay itself); see RefundSuccessfulEmailData for the separate email sent once an admin
 * actually completes the refund.
 */
public record OrderCancelledEmailData(
        String customerEmail,
        String customerName,
        String orderNumber,
        String cancelledDate,
        BigDecimal totalAmount,
        boolean refundRequired
) {
}
