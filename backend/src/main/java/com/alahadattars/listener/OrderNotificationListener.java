package com.alahadattars.listener;

import com.alahadattars.event.OrderCreatedEvent;
import com.alahadattars.service.EmailService;
import com.alahadattars.service.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Handles OrderCreatedEvent strictly AFTER the database transaction has committed.
 *
 * This guarantees that:
 * 1. Notification dispatch only occurs if PostgreSQL changes are successfully committed.
 * 2. If the transaction rolls back, no email or message is ever sent.
 * 3. Under email queue saturation (CallerRunsPolicy), synchronous execution by the calling thread
 *    takes place AFTER the PostgreSQL connection has already been returned to HikariCP,
 *    preventing connection-pool starvation.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderNotificationListener {

    private final EmailService emailService;
    private final NotificationService notificationService;

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderCreated(OrderCreatedEvent event) {
        log.info("Order transaction committed for Order #{}. Dispatching notifications.", event.getOrderNumber());
        try {
            if (event.getOrder() != null) {
                notificationService.sendOrderNotification(event.getOrder());
            }
        } catch (Exception e) {
            log.error("Failed to dispatch in-app/external notifications for Order #{}: {}",
                    event.getOrderNumber(), e.getMessage(), e);
        }

        try {
            if (event.getConfirmationEmailData() != null) {
                emailService.sendOrderConfirmedEmail(event.getConfirmationEmailData());
            }
        } catch (Exception e) {
            log.error("Failed to dispatch confirmation email for Order #{}: {}",
                    event.getOrderNumber(), e.getMessage(), e);
        }

        try {
            if (event.getAdminNewOrderEmailData() != null) {
                emailService.sendAdminNewOrderEmail(event.getAdminNewOrderEmailData());
            }
        } catch (Exception e) {
            log.error("Failed to dispatch admin notification email for Order #{}: {}",
                    event.getOrderNumber(), e.getMessage(), e);
        }
    }
}
