package com.alahadattars.event;

import com.alahadattars.dto.email.AdminNewOrderEmailData;
import com.alahadattars.dto.email.OrderConfirmationEmailData;
import com.alahadattars.entity.Order;
import lombok.Getter;

/**
 * Event published when an order is created and persisted, to decouple
 * asynchronous email and notification dispatch from the database transaction.
 *
 * Listeners handle this event in TransactionPhase.AFTER_COMMIT to ensure that
 * external network I/O (SMTP, WhatsApp, SMS) and CallerRunsPolicy execution
 * never hold a database connection from the HikariCP pool.
 */
@Getter
public class OrderCreatedEvent {

    private final Long orderId;
    private final String orderNumber;
    private final OrderConfirmationEmailData confirmationEmailData;
    private final AdminNewOrderEmailData adminNewOrderEmailData;
    private final Order order;

    public OrderCreatedEvent(Long orderId,
                             String orderNumber,
                             OrderConfirmationEmailData confirmationEmailData,
                             AdminNewOrderEmailData adminNewOrderEmailData,
                             Order order) {
        this.orderId = orderId;
        this.orderNumber = orderNumber;
        this.confirmationEmailData = confirmationEmailData;
        this.adminNewOrderEmailData = adminNewOrderEmailData;
        this.order = order;
    }
}
