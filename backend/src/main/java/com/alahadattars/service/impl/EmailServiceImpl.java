package com.alahadattars.service.impl;

import com.alahadattars.dto.email.AdminNewOrderEmailData;
import com.alahadattars.dto.email.AdminOrderCancelledEmailData;
import com.alahadattars.dto.email.AdminRefundFailedEmailData;
import com.alahadattars.dto.email.OrderCancelledEmailData;
import com.alahadattars.dto.email.OrderConfirmationEmailData;
import com.alahadattars.dto.email.OrderDeliveredEmailData;
import com.alahadattars.dto.email.OrderPackedEmailData;
import com.alahadattars.dto.email.OrderShippedEmailData;
import com.alahadattars.dto.email.RefundSuccessfulEmailData;
import com.alahadattars.email.EmailConstants;
import com.alahadattars.email.EmailTemplateBuilder;
import com.alahadattars.service.EmailService;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Sends every transactional email via SMTP (Spring Mail / JavaMailSender). Every public method
 * is {@code @Async} and wraps its entire body in a try/catch — a failure here (bad SMTP config,
 * network blip, provider outage) is logged and nothing else. It can never throw back into the
 * caller's transaction, so order placement, registration, etc. always succeed regardless of
 * whether email delivery does.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${app.mail.from}")
    private String fromAddress;

    @Value("${app.mail.enabled:true}")
    private boolean mailEnabled;

    @Value("${app.mail.admin-notification-email:}")
    private String adminNotificationEmail;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Value("${app.support-email}")
    private String supportEmail;

    @Override
    @Async("emailTaskExecutor")
    public void sendWelcomeEmail(String toEmail, String customerName) {
        try {
            String loginUrl = frontendUrl + EmailConstants.LOGIN_PATH;
            String html = EmailTemplateBuilder.buildWelcomeEmail(customerName, loginUrl, supportEmail);
            send(toEmail, EmailConstants.SUBJECT_WELCOME, html);
        } catch (Exception e) {
            log.error("Failed to send welcome email to {}: {}", toEmail, e.getMessage(), e);
        }
    }

    @Override
    @Async("emailTaskExecutor")
    public void sendOrderConfirmedEmail(OrderConfirmationEmailData data) {
        try {
            String html = EmailTemplateBuilder.buildOrderConfirmedEmail(data, supportEmail);
            send(data.customerEmail(), EmailConstants.SUBJECT_ORDER_CONFIRMED, html);
        } catch (Exception e) {
            log.error("Failed to send order-confirmed email for order {}: {}", data.orderNumber(), e.getMessage(), e);
        }
    }

    @Override
    @Async("emailTaskExecutor")
    public void sendOrderPackedEmail(OrderPackedEmailData data) {
        try {
            String html = EmailTemplateBuilder.buildOrderPackedEmail(data, supportEmail);
            send(data.customerEmail(), EmailConstants.SUBJECT_ORDER_PACKED, html);
        } catch (Exception e) {
            log.error("Failed to send order-packed email for order {}: {}", data.orderNumber(), e.getMessage(), e);
        }
    }

    @Override
    @Async("emailTaskExecutor")
    public void sendOrderShippedEmail(OrderShippedEmailData data) {
        try {
            String html = EmailTemplateBuilder.buildOrderShippedEmail(data, supportEmail);
            send(data.customerEmail(), EmailConstants.SUBJECT_ORDER_SHIPPED, html);
        } catch (Exception e) {
            log.error("Failed to send order-shipped email for order {}: {}", data.orderNumber(), e.getMessage(), e);
        }
    }

    @Override
    @Async("emailTaskExecutor")
    public void sendOrderDeliveredEmail(OrderDeliveredEmailData data) {
        try {
            String html = EmailTemplateBuilder.buildOrderDeliveredEmail(data, supportEmail);
            send(data.customerEmail(), EmailConstants.SUBJECT_ORDER_DELIVERED, html);
        } catch (Exception e) {
            log.error("Failed to send order-delivered email for order {}: {}", data.orderNumber(), e.getMessage(), e);
        }
    }

    @Override
    @Async("emailTaskExecutor")
    public void sendPasswordResetEmail(String toEmail, String customerName, String rawToken, int expiryMinutes) {
        try {
            String resetUrl = frontendUrl + EmailConstants.RESET_PASSWORD_PATH + "?token=" + rawToken;
            String html = EmailTemplateBuilder.buildPasswordResetEmail(customerName, resetUrl, expiryMinutes, supportEmail);
            send(toEmail, EmailConstants.SUBJECT_PASSWORD_RESET, html);
        } catch (Exception e) {
            log.error("Failed to send password-reset email to {}: {}", toEmail, e.getMessage(), e);
        }
    }

    @Override
    @Async("emailTaskExecutor")
    public void sendAdminNewOrderEmail(AdminNewOrderEmailData data) {
        try {
            String recipient = resolveAdminRecipient("new-order", data.orderNumber());
            if (recipient == null) {
                return;
            }
            String html = EmailTemplateBuilder.buildAdminNewOrderEmail(data, supportEmail);
            send(recipient, EmailConstants.SUBJECT_ADMIN_NEW_ORDER, html);
        } catch (Exception e) {
            log.error("Failed to send admin new-order email for order {}: {}", data.orderNumber(), e.getMessage(), e);
        }
    }

    @Override
    @Async("emailTaskExecutor")
    public void sendOrderCancelledEmail(OrderCancelledEmailData data) {
        try {
            String html = EmailTemplateBuilder.buildOrderCancelledEmail(data, supportEmail);
            send(data.customerEmail(), EmailConstants.SUBJECT_ORDER_CANCELLED, html);
        } catch (Exception e) {
            log.error("Failed to send order-cancelled email for order {}: {}", data.orderNumber(), e.getMessage(), e);
        }
    }

    @Override
    @Async("emailTaskExecutor")
    public void sendRefundSuccessfulEmail(RefundSuccessfulEmailData data) {
        try {
            String html = EmailTemplateBuilder.buildRefundSuccessfulEmail(data, supportEmail);
            send(data.customerEmail(), EmailConstants.SUBJECT_REFUND_SUCCESSFUL, html);
        } catch (Exception e) {
            log.error("Failed to send refund-successful email for order {}: {}", data.orderNumber(), e.getMessage(), e);
        }
    }

    @Override
    @Async("emailTaskExecutor")
    public void sendAdminOrderCancelledEmail(AdminOrderCancelledEmailData data) {
        try {
            String recipient = resolveAdminRecipient("order-cancelled", data.orderNumber());
            if (recipient == null) {
                return;
            }
            String html = EmailTemplateBuilder.buildAdminOrderCancelledEmail(data, supportEmail);
            send(recipient, EmailConstants.SUBJECT_ADMIN_ORDER_CANCELLED, html);
        } catch (Exception e) {
            log.error("Failed to send admin order-cancelled email for order {}: {}", data.orderNumber(), e.getMessage(), e);
        }
    }

    @Override
    @Async("emailTaskExecutor")
    public void sendAdminRefundFailedEmail(AdminRefundFailedEmailData data) {
        try {
            String recipient = resolveAdminRecipient("refund-failed", data.orderNumber());
            if (recipient == null) {
                return;
            }
            String html = EmailTemplateBuilder.buildAdminRefundFailedEmail(data, supportEmail);
            send(recipient, EmailConstants.SUBJECT_ADMIN_REFUND_FAILED, html);
        } catch (Exception e) {
            log.error("Failed to send admin refund-failed email for order {}: {}", data.orderNumber(), e.getMessage(), e);
        }
    }

    // ------------------------------------------------------------------
    // Core send
    // ------------------------------------------------------------------

    /** Returns the configured admin recipient, or null (after logging) if none is configured. */
    private String resolveAdminRecipient(String emailKind, String orderNumber) {
        if (adminNotificationEmail == null || adminNotificationEmail.isBlank()) {
            log.warn("Skipping admin {} email for order {}: no ADMIN_NOTIFICATION_EMAIL/ADMIN_EMAIL configured.",
                    emailKind, orderNumber);
            return null;
        }
        return adminNotificationEmail;
    }

    private void send(String to, String subject, String html) {
        if (!mailEnabled) {
            log.info("Email sending disabled (app.mail.enabled=false) — skipped '{}' to {}.", subject, to);
            return;
        }
        if (mailHost == null || mailHost.isBlank()) {
            log.warn("Email SMTP not configured (MAIL_HOST unset) — skipped '{}' to {}.", subject, to);
            return;
        }
        if (to == null || to.isBlank()) {
            log.warn("Email skipped: no recipient address for subject '{}'.", subject);
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setTo(to);
            helper.setFrom(fromAddress);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
            log.info("Sent email '{}' to {}.", subject, to);
        } catch (MailException | jakarta.mail.MessagingException e) {
            log.error("SMTP send failed for '{}' to {}: {}", subject, to, e.getMessage(), e);
        }
    }
}
