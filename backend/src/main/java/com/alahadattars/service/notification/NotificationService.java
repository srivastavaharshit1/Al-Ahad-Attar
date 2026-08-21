package com.alahadattars.service.notification;

import com.alahadattars.entity.Order;

public interface NotificationService {
    /**
     * Notify administrators about a new order.
     * @param order The order that was placed.
     */
    void sendOrderNotification(Order order);

    /**
     * Notify administrators about a cancelled order.
     * @param order The order that was cancelled.
     */
    void sendOrderCancelledNotification(Order order);

    /**
     * Notify the customer that the admin has successfully completed their refund.
     * @param order The order with refundStatus=REFUNDED and refundId set.
     */
    void sendRefundCompletedNotification(Order order);
}
