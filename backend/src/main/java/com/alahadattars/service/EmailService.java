package com.alahadattars.service;

import com.alahadattars.dto.email.AdminNewOrderEmailData;
import com.alahadattars.dto.email.AdminOrderCancelledEmailData;
import com.alahadattars.dto.email.AdminRefundFailedEmailData;
import com.alahadattars.dto.email.OrderCancelledEmailData;
import com.alahadattars.dto.email.OrderConfirmationEmailData;
import com.alahadattars.dto.email.OrderDeliveredEmailData;
import com.alahadattars.dto.email.OrderPackedEmailData;
import com.alahadattars.dto.email.OrderShippedEmailData;
import com.alahadattars.dto.email.RefundSuccessfulEmailData;

/**
 * Sends every transactional email in the system. All methods are fire-and-forget from the
 * caller's perspective: they run asynchronously and never throw — a failed send is logged
 * internally and nothing else. Callers must not rely on the email having been sent by the time
 * the method returns, and must never wrap these calls in a way that could fail the caller's own
 * operation (order placement, registration, etc.) if sending fails.
 *
 * Methods take plain DTOs, not JPA entities — entity data must be extracted to a DTO inside the
 * caller's transaction before calling here, since these methods may run on a different thread
 * after the originating transaction/Hibernate session has closed.
 */
public interface EmailService {

    void sendWelcomeEmail(String toEmail, String customerName);

    void sendOrderConfirmedEmail(OrderConfirmationEmailData data);

    void sendOrderPackedEmail(OrderPackedEmailData data);

    void sendOrderShippedEmail(OrderShippedEmailData data);

    void sendOrderDeliveredEmail(OrderDeliveredEmailData data);

    void sendPasswordResetEmail(String toEmail, String customerName, String rawToken, int expiryMinutes);

    void sendAdminNewOrderEmail(AdminNewOrderEmailData data);

    void sendOrderCancelledEmail(OrderCancelledEmailData data);

    void sendRefundSuccessfulEmail(RefundSuccessfulEmailData data);

    void sendAdminOrderCancelledEmail(AdminOrderCancelledEmailData data);

    void sendAdminRefundFailedEmail(AdminRefundFailedEmailData data);

    void sendAdminStuckCheckoutEmail(com.alahadattars.dto.email.AdminStuckCheckoutEmailData data);
}
