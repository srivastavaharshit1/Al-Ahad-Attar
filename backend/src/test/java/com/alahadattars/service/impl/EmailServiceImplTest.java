package com.alahadattars.service.impl;

import com.alahadattars.dto.email.OrderConfirmationEmailData;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Verifies EmailServiceImpl's core resilience contract: no matter what fails inside — bad SMTP
 * config, an unreachable server, a malformed message — nothing ever propagates back to the
 * caller. This is what actually guarantees "order placement must never fail because email
 * sending fails": these methods are called synchronously from within OrderServiceImpl/
 * AuthenticationServiceImpl's own transactions (the @Async proxy is what makes the *call*
 * non-blocking; this test proves the method body itself is also exception-safe even when
 * invoked directly, which is what happens once @Async hands it off to the worker thread).
 */
@ExtendWith(MockitoExtension.class)
class EmailServiceImplTest {

    @Mock
    private JavaMailSender mailSender;

    private EmailServiceImpl emailService;

    @BeforeEach
    void setUp() {
        emailService = new EmailServiceImpl(mailSender);
        ReflectionTestUtils.setField(emailService, "mailHost", "smtp.example.com");
        ReflectionTestUtils.setField(emailService, "fromAddress", "noreply@alahadattars.com");
        ReflectionTestUtils.setField(emailService, "mailEnabled", true);
        ReflectionTestUtils.setField(emailService, "adminNotificationEmail", "admin@alahadattars.com");
        ReflectionTestUtils.setField(emailService, "frontendUrl", "http://localhost:5173");
        ReflectionTestUtils.setField(emailService, "supportEmail", "contact@alahadattars.com");
    }

    @Test
    void sendWelcomeEmail_neverThrows_whenMailSenderThrowsOnCreateMimeMessage() {
        when(mailSender.createMimeMessage()).thenThrow(new RuntimeException("mail session exploded"));

        assertDoesNotThrow(() -> emailService.sendWelcomeEmail("customer@example.com", "Test User"),
                "a failure while building the message must never propagate to the caller");
    }

    @Test
    void sendWelcomeEmail_neverThrows_whenSmtpSendFails() {
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage((Session) null));
        doThrow(new MailSendException("Connection refused")).when(mailSender).send(any(MimeMessage.class));

        assertDoesNotThrow(() -> emailService.sendWelcomeEmail("customer@example.com", "Test User"),
                "an SMTP-level send failure must never propagate to the caller");
    }

    @Test
    void sendOrderConfirmedEmail_neverThrows_whenSmtpSendFails() {
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage((Session) null));
        doThrow(new MailSendException("Connection refused")).when(mailSender).send(any(MimeMessage.class));

        OrderConfirmationEmailData data = new OrderConfirmationEmailData(
                "customer@example.com", "Test User", "ORD-1", "29 Jul 2026",
                List.of(), null, BigDecimal.TEN, "ONLINE"
        );

        assertDoesNotThrow(() -> emailService.sendOrderConfirmedEmail(data),
                "order-confirmation email failures must never affect order placement");
    }

    @Test
    void sendWelcomeEmail_skipsCleanly_whenSmtpHostNotConfigured() {
        ReflectionTestUtils.setField(emailService, "mailHost", "");

        assertDoesNotThrow(() -> emailService.sendWelcomeEmail("customer@example.com", "Test User"));
        verify(mailSender, org.mockito.Mockito.never()).createMimeMessage();
    }

    @Test
    void sendWelcomeEmail_skipsCleanly_whenMailDisabled() {
        ReflectionTestUtils.setField(emailService, "mailEnabled", false);

        assertDoesNotThrow(() -> emailService.sendWelcomeEmail("customer@example.com", "Test User"));
        verify(mailSender, org.mockito.Mockito.never()).createMimeMessage();
    }

    @Test
    void sendWelcomeEmail_sendsSuccessfully_whenConfiguredCorrectly() {
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage((Session) null));

        emailService.sendWelcomeEmail("customer@example.com", "Test User");

        verify(mailSender).send(any(MimeMessage.class));
    }
}
