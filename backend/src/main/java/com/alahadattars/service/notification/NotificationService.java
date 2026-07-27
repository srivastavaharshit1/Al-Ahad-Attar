package com.alahadattars.service.notification;

import com.alahadattars.entity.Order;

public interface NotificationService {
    /**
     * Notify administrators about a new order.
     * @param order The order that was placed.
     */
    void sendOrderNotification(Order order);

    /**
     * Notify the customer that their cancellation has been accepted and refund is pending admin approval.
     * @param order The cancelled order with refundStatus=PENDING.
     */
    void sendRefundPendingNotification(Order order);

    /**
     * Notify the customer that the admin has successfully completed their refund.
     * @param order The order with refundStatus=COMPLETED and refundId set.
     */
    void sendRefundCompletedNotification(Order order);
}
