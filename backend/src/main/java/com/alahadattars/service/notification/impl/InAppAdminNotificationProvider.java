package com.alahadattars.service.notification.impl;

import com.alahadattars.entity.AdminNotification;
import com.alahadattars.entity.Order;
import com.alahadattars.repository.AdminNotificationRepository;
import com.alahadattars.service.notification.NotificationProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class InAppAdminNotificationProvider implements NotificationProvider {

    private final AdminNotificationRepository adminNotificationRepository;

    @Override
    public void sendNewOrderNotification(Order order) {
        try {
            String customerName = order.getUser() != null ? (order.getUser().getFirstName() + " " + order.getUser().getLastName()) : "A customer";
            AdminNotification notification = AdminNotification.builder()
                    .message("New order placed: " + order.getOrderNumber() + " by " + customerName)
                    .type("ORDER_PLACED")
                    .orderId(order.getId())
                    .build();
            adminNotificationRepository.save(notification);
            log.info("In-app notification saved for new order {}", order.getOrderNumber());
        } catch (Exception e) {
            log.error("Failed to save in-app notification for new order {}", order.getOrderNumber(), e);
        }
    }

    @Override
    public void sendOrderCancelledNotification(Order order) {
        try {
            String customerName = order.getUser() != null ? (order.getUser().getFirstName() + " " + order.getUser().getLastName()) : "A customer";
            AdminNotification notification = AdminNotification.builder()
                    .message("Order cancelled: " + order.getOrderNumber() + " by " + customerName)
                    .type("ORDER_CANCELLED")
                    .orderId(order.getId())
                    .build();
            adminNotificationRepository.save(notification);
            log.info("In-app notification saved for cancelled order {}", order.getOrderNumber());
        } catch (Exception e) {
            log.error("Failed to save in-app notification for cancelled order {}", order.getOrderNumber(), e);
        }
    }

    @Override
    public void sendRefundCompletedNotification(Order order) {
        try {
            AdminNotification notification = AdminNotification.builder()
                    .message("Refund completed for order: " + order.getOrderNumber())
                    .type("REFUND_COMPLETED")
                    .orderId(order.getId())
                    .build();
            adminNotificationRepository.save(notification);
            log.info("In-app notification saved for completed refund {}", order.getOrderNumber());
        } catch (Exception e) {
            log.error("Failed to save in-app notification for completed refund {}", order.getOrderNumber(), e);
        }
    }
}
