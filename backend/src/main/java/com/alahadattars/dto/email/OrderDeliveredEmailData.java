package com.alahadattars.dto.email;

import java.math.BigDecimal;
import java.util.List;

public record OrderDeliveredEmailData(
        String customerEmail,
        String customerName,
        String orderNumber,
        String orderDate,
        List<EmailOrderItem> items,
        BigDecimal totalAmount
) {
}
