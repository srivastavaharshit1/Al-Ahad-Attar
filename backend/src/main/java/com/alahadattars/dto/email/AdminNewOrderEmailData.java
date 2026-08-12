package com.alahadattars.dto.email;

import java.math.BigDecimal;
import java.util.List;

public record AdminNewOrderEmailData(
        String orderNumber,
        String customerName,
        String customerPhone,
        EmailAddress shippingAddress,
        List<EmailOrderItem> items,
        BigDecimal totalAmount
) {
}
