package com.alahadattars.dto.email;

import java.math.BigDecimal;

/**
 * One product line for an order-related email. Deliberately a plain record (not the OrderItem
 * entity) so EmailService never touches a JPA-managed object from its async thread.
 */
public record EmailOrderItem(String productName, String size, int quantity, BigDecimal unitPrice) {

    public BigDecimal lineTotal() {
        return unitPrice.multiply(BigDecimal.valueOf(quantity));
    }
}
