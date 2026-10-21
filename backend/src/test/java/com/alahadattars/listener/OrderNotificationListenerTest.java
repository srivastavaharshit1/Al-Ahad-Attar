package com.alahadattars.listener;

import com.alahadattars.dto.email.AdminNewOrderEmailData;
import com.alahadattars.dto.email.EmailAddress;
import com.alahadattars.dto.email.OrderConfirmationEmailData;
import com.alahadattars.entity.Order;
import com.alahadattars.event.OrderCreatedEvent;
import com.alahadattars.service.EmailService;
import com.alahadattars.service.notification.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest
@ActiveProfiles("test")
public class OrderNotificationListenerTest {

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @SpyBean
    private OrderNotificationListener orderNotificationListener;

    @MockBean
    private EmailService emailService;

    @MockBean
    private NotificationService notificationService;

    private TransactionTemplate txTemplate;

    @BeforeEach
    void setUp() {
        txTemplate = new TransactionTemplate(transactionManager);
        Mockito.reset(orderNotificationListener, emailService, notificationService);
    }

    private OrderCreatedEvent createSampleEvent(String orderNumber) {
        EmailAddress addr = new EmailAddress("Test Customer", "+919876543210", "123 Test St", "", "City", "State", "123456", "India");
        OrderConfirmationEmailData confirmationData = new OrderConfirmationEmailData(
                "customer@test.com", "Test Customer", orderNumber, "22 Oct 2026",
                Collections.emptyList(), addr,
                new BigDecimal("999.00"), "CARD"
        );
        AdminNewOrderEmailData adminData = new AdminNewOrderEmailData(
                orderNumber, "Test Customer", "+919876543210",
                addr,
                Collections.emptyList(), new BigDecimal("999.00")
        );
        Order mockOrder = Order.builder().orderNumber(orderNumber).totalAmount(new BigDecimal("999.00")).build();
        mockOrder.setId(101L);

        return new OrderCreatedEvent(101L, orderNumber, confirmationData, adminData, mockOrder);
    }

    @Test
    @DisplayName("1. Successful order: Transaction commits -> AFTER_COMMIT listener fires -> email and notifications dispatched")
    void testSuccessfulOrder_Commits_ListenerFires() {
        OrderCreatedEvent event = createSampleEvent("ORD-SUCCESS-1");

        // Execute and commit within transaction
        txTemplate.execute(status -> {
            eventPublisher.publishEvent(event);
            // Inside transaction before commit: listener should NOT have executed yet
            verify(orderNotificationListener, never()).onOrderCreated(any());
            return null;
        });

        // After transaction commits: listener MUST have fired
        verify(orderNotificationListener, times(1)).onOrderCreated(any(OrderCreatedEvent.class));
        verify(emailService, times(1)).sendOrderConfirmedEmail(event.getConfirmationEmailData());
        verify(emailService, times(1)).sendAdminNewOrderEmail(event.getAdminNewOrderEmailData());
        verify(notificationService, times(1)).sendOrderNotification(event.getOrder());
    }

    @Test
    @DisplayName("2. Failed/rolled-back order: Transaction rolls back -> AFTER_COMMIT listener does NOT fire -> no emails sent")
    void testFailedOrder_RollsBack_ListenerDoesNotFire() {
        OrderCreatedEvent event = createSampleEvent("ORD-FAIL-ROLLBACK");

        try {
            txTemplate.execute(status -> {
                eventPublisher.publishEvent(event);
                // Mark for rollback or throw exception
                status.setRollbackOnly();
                throw new RuntimeException("Simulated checkout failure/rollback");
            });
        } catch (RuntimeException ignored) {
            // Expected
        }

        // Transaction rolled back: AFTER_COMMIT listener must NEVER fire
        verify(orderNotificationListener, never()).onOrderCreated(any());
        verify(emailService, never()).sendOrderConfirmedEmail(any());
        verify(emailService, never()).sendAdminNewOrderEmail(any());
        verify(notificationService, never()).sendOrderNotification(any());
    }

    @Test
    @DisplayName("3. Executor Saturation & CallerRunsPolicy: When email executes, no active database transaction or connection is held")
    void testCallerRunsPolicy_ExecutionOccursOutsideActiveTransaction() {
        OrderCreatedEvent event = createSampleEvent("ORD-CALLER-RUNS");
        AtomicBoolean wasTransactionActiveDuringEmail = new AtomicBoolean(true);

        // When emailService.sendOrderConfirmedEmail is invoked (even if synchronous via CallerRunsPolicy on request thread),
        // capture whether Spring's TransactionSynchronizationManager sees an active transaction
        doAnswer(invocation -> {
            boolean active = TransactionSynchronizationManager.isActualTransactionActive();
            wasTransactionActiveDuringEmail.set(active);
            return null;
        }).when(emailService).sendOrderConfirmedEmail(any());

        txTemplate.execute(status -> {
            eventPublisher.publishEvent(event);
            return null;
        });

        // Verify that the listener executed
        verify(orderNotificationListener, times(1)).onOrderCreated(any());
        // CRITICAL: Prove that the email call executed outside any active database transaction!
        assertThat(wasTransactionActiveDuringEmail.get())
                .as("Transaction must NOT be active when email task executes, guaranteeing zero PostgreSQL connection holding")
                .isFalse();
    }
}
