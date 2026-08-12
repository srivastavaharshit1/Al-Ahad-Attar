package com.alahadattars.dto.email;

import java.math.BigDecimal;

/** refundStatus is the plain enum name (e.g. "REFUNDED", "FAILED", "NOT_REQUIRED") for display. */
public record AdminOrderCancelledEmailData(
        String orderNumber,
        String customerName,
        BigDecimal totalAmount,
        String refundStatus
) {
}
