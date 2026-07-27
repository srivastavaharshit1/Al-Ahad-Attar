package com.alahadattars.service.notification;

import com.alahadattars.entity.Order;

public interface NotificationProvider {
    /**
     * Sends a notification for a newly created order.
     * @param order The order to notify about.
     */
    void sendNewOrderNotification(Order order);

    /**
     * Sends a notification when a refund is queued (status=PENDING).
     * Default no-op allows providers to opt-in selectively.
     */
    default void sendRefundPendingNotification(Order order) {}

    /**
     * Sends a notification when a refund is successfully completed.
     * Default no-op allows providers to opt-in selectively.
     */
    default void sendRefundCompletedNotification(Order order) {}
}
