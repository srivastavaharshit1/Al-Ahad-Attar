package com.alahadattars.service.notification.impl;

import com.alahadattars.entity.Order;
import com.alahadattars.service.notification.NotificationProvider;
import com.alahadattars.service.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final List<NotificationProvider> providers;

    @Override
    @Async("emailTaskExecutor")
    public void sendOrderNotification(Order order) {
        log.info("Sending order notifications for Order #{}", order.getOrderNumber());
        for (NotificationProvider provider : providers) {
            try {
                provider.sendNewOrderNotification(order);
            } catch (Exception e) {
                log.error("Failed to send order notification using provider {}", provider.getClass().getSimpleName(), e);
            }
        }
    }

    @Override
    @Async("emailTaskExecutor")
    public void sendOrderCancelledNotification(Order order) {
        log.info("Sending order cancelled notifications for Order #{}", order.getOrderNumber());
        for (NotificationProvider provider : providers) {
            try {
                provider.sendOrderCancelledNotification(order);
            } catch (Exception e) {
                log.error("Failed to send order cancelled notification using provider {}", provider.getClass().getSimpleName(), e);
            }
        }
    }

    @Override
    @Async("emailTaskExecutor")
    public void sendRefundCompletedNotification(Order order) {
        log.info("Sending refund-completed notifications for Order #{}", order.getOrderNumber());
        for (NotificationProvider provider : providers) {
            try {
                provider.sendRefundCompletedNotification(order);
            } catch (Exception e) {
                log.error("Failed to send refund-completed notification using provider {}", provider.getClass().getSimpleName(), e);
            }
        }
    }
}
