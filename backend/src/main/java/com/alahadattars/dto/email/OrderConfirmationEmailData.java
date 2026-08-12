package com.alahadattars.dto.email;

import java.math.BigDecimal;
import java.util.List;

public record OrderConfirmationEmailData(
        String customerEmail,
        String customerName,
        String orderNumber,
        String orderDate,
        List<EmailOrderItem> items,
        EmailAddress shippingAddress,
        BigDecimal totalAmount,
        String paymentMethod
) {
}
