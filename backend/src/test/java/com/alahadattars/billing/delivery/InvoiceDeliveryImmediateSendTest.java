package com.alahadattars.billing.delivery;

import com.alahadattars.billing.invoice.InvoiceChannel;
import com.alahadattars.billing.invoice.InvoiceJdbcRepository;
import com.alahadattars.billing.invoice.InvoiceListItem;
import com.alahadattars.billing.invoice.InvoicePaperFormat;
import com.alahadattars.billing.invoice.InvoicePdfDocument;
import com.alahadattars.billing.security.AuthenticatedBillingAdmin;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class InvoiceDeliveryImmediateSendTest {

    private InvoiceJdbcRepository mockInvoiceRepo;
    private InvoiceDeliveryJdbcRepository mockDeliveryRepo;
    private InvoiceChannelSender mockWhatsAppSender;
    private InvoiceDeliveryService service;
    private AuthenticatedBillingAdmin admin;

    @BeforeEach
    void setUp() {
        mockInvoiceRepo = mock(InvoiceJdbcRepository.class);
        mockDeliveryRepo = mock(InvoiceDeliveryJdbcRepository.class);
        mockWhatsAppSender = mock(InvoiceChannelSender.class);
        when(mockWhatsAppSender.channel()).thenReturn(InvoiceDeliveryChannel.WHATSAPP);

        InvoiceConsentPolicyProvider consentProvider = new InvoiceConsentPolicyProvider(
                "v1", "Email consent wording", "v1_pos_counter", "WhatsApp consent wording"
        );

        service = new InvoiceDeliveryService(
                mockInvoiceRepo,
                mockDeliveryRepo,
                List.of(mockWhatsAppSender),
                consentProvider
        );

        admin = new AuthenticatedBillingAdmin(1L, "admin@alahadattars.com");
    }

    private InvoiceListItem sampleInvoice() {
        return new InvoiceListItem(
                42L,
                UUID.randomUUID(),
                "POS-2026-27-00042",
                InvoiceChannel.POS,
                "Demo Customer",
                new BigDecimal("500.00"),
                Instant.now()
        );
    }

    @Test
    void sendImmediate_recordsBlockedConsent_whenCustomerHasExplicitlyRevokedConsent() {
        when(mockInvoiceRepo.findHistoryItem(42L)).thenReturn(Optional.of(sampleInvoice()));
        when(mockWhatsAppSender.isAvailable()).thenReturn(true);
        when(mockInvoiceRepo.findPdf(42L, InvoicePaperFormat.A4))
                .thenReturn(Optional.of(new InvoicePdfDocument(42L, InvoicePaperFormat.A4, "sha", "pdf".getBytes())));

        InvoiceDeliveryView revokedConsentView = new InvoiceDeliveryView(
                101L, UUID.randomUUID(), InvoiceDeliveryChannel.WHATSAPP,
                InvoiceDeliveryStatus.SKIPPED_NO_CONSENT, 0, "+919876543210",
                null, "CONSENT_REVOKED", "Customer has explicitly revoked or declined WhatsApp delivery for this invoice",
                Instant.now(), Instant.now()
        );

        when(mockDeliveryRepo.prepareImmediateJob(
                eq(42L), eq(InvoiceDeliveryChannel.WHATSAPP), eq("+919876543210"),
                eq(1L), eq("idem-revoked"), eq(true), eq(true), any(InvoiceListItem.class)))
                .thenReturn(new InvoiceDeliveryJdbcRepository.ImmediateClaimResult.Terminal(revokedConsentView));

        InvoiceDeliveryView result = service.sendImmediate(admin, 42L, InvoiceDeliveryChannel.WHATSAPP, "idem-revoked", "9876543210");

        assertThat(result.status()).isEqualTo(InvoiceDeliveryStatus.SKIPPED_NO_CONSENT);
        assertThat(result.lastErrorCode()).isEqualTo("CONSENT_REVOKED");
        verify(mockWhatsAppSender, never()).send(any(), any(), any(), any());
    }

    @Test
    void sendImmediate_recordsBlockedConfiguration_whenSenderNotAvailable() {
        when(mockInvoiceRepo.findHistoryItem(42L)).thenReturn(Optional.of(sampleInvoice()));
        when(mockWhatsAppSender.isAvailable()).thenReturn(false);

        InvoiceDeliveryView blockedView = new InvoiceDeliveryView(
                100L, UUID.randomUUID(), InvoiceDeliveryChannel.WHATSAPP,
                InvoiceDeliveryStatus.BLOCKED_CONFIGURATION, 0, "+919876543210",
                null, "WHATSAPP_NOT_CONFIGURED", "Invoice WhatsApp delivery is not configured on the server",
                Instant.now(), Instant.now()
        );
        when(mockDeliveryRepo.prepareImmediateJob(
                eq(42L), eq(InvoiceDeliveryChannel.WHATSAPP), eq("+919876543210"),
                eq(1L), eq("idem-key-1"), eq(false), eq(false), any(InvoiceListItem.class)))
                .thenReturn(new InvoiceDeliveryJdbcRepository.ImmediateClaimResult.Terminal(blockedView));

        InvoiceDeliveryView result = service.sendImmediate(admin, 42L, InvoiceDeliveryChannel.WHATSAPP, "idem-key-1", "9876543210");

        assertThat(result.status()).isEqualTo(InvoiceDeliveryStatus.BLOCKED_CONFIGURATION);
        assertThat(result.lastErrorCode()).isEqualTo("WHATSAPP_NOT_CONFIGURED");
        verify(mockWhatsAppSender, never()).send(any(), any(), any(), any());
    }

    @Test
    void sendImmediate_returnsExistingView_onDuplicateClickWithSameKey() {
        when(mockInvoiceRepo.findHistoryItem(42L)).thenReturn(Optional.of(sampleInvoice()));
        when(mockWhatsAppSender.isAvailable()).thenReturn(true);
        when(mockInvoiceRepo.findPdf(42L, InvoicePaperFormat.A4))
                .thenReturn(Optional.of(new InvoicePdfDocument(42L, InvoicePaperFormat.A4, "fake-sha", "dummy-pdf".getBytes())));

        InvoiceDeliveryView existingAcceptedView = new InvoiceDeliveryView(
                102L, UUID.randomUUID(), InvoiceDeliveryChannel.WHATSAPP,
                InvoiceDeliveryStatus.PROVIDER_ACCEPTED, 1, "+919876543210",
                "wamid.AcceptedPrev", null, null, Instant.now(), Instant.now()
        );

        when(mockDeliveryRepo.prepareImmediateJob(
                eq(42L), eq(InvoiceDeliveryChannel.WHATSAPP), eq("+919876543210"),
                eq(1L), eq("idem-duplicate"), eq(true), eq(true), any(InvoiceListItem.class)))
                .thenReturn(new InvoiceDeliveryJdbcRepository.ImmediateClaimResult.Terminal(existingAcceptedView));

        InvoiceDeliveryView result = service.sendImmediate(admin, 42L, InvoiceDeliveryChannel.WHATSAPP, "idem-duplicate", "+919876543210");

        assertThat(result.status()).isEqualTo(InvoiceDeliveryStatus.PROVIDER_ACCEPTED);
        assertThat(result.providerMessageId()).isEqualTo("wamid.AcceptedPrev");
        verify(mockWhatsAppSender, never()).send(any(), any(), any(), any());
    }

    @Test
    void sendImmediate_preventsDuplicateSend_whenPreviousDeliveryIsAmbiguous() {
        when(mockInvoiceRepo.findHistoryItem(42L)).thenReturn(Optional.of(sampleInvoice()));
        when(mockWhatsAppSender.isAvailable()).thenReturn(true);
        when(mockInvoiceRepo.findPdf(42L, InvoicePaperFormat.A4))
                .thenReturn(Optional.of(new InvoicePdfDocument(42L, InvoicePaperFormat.A4, "fake-sha", "dummy-pdf".getBytes())));

        InvoiceDeliveryView ambiguousView = new InvoiceDeliveryView(
                103L, UUID.randomUUID(), InvoiceDeliveryChannel.WHATSAPP,
                InvoiceDeliveryStatus.AMBIGUOUS, 1, "+919876543210",
                null, "WHATSAPP_TIMEOUT", "Delivery outcome uncertain", Instant.now(), Instant.now()
        );

        when(mockDeliveryRepo.prepareImmediateJob(
                eq(42L), eq(InvoiceDeliveryChannel.WHATSAPP), eq("+919876543210"),
                eq(1L), eq("idem-ambiguous-retry"), eq(true), eq(true), any(InvoiceListItem.class)))
                .thenReturn(new InvoiceDeliveryJdbcRepository.ImmediateClaimResult.Terminal(ambiguousView));

        InvoiceDeliveryView result = service.sendImmediate(admin, 42L, InvoiceDeliveryChannel.WHATSAPP, "idem-ambiguous-retry", "+919876543210");

        assertThat(result.status()).isEqualTo(InvoiceDeliveryStatus.AMBIGUOUS);
        assertThat(result.lastErrorCode()).isEqualTo("WHATSAPP_TIMEOUT");
        verify(mockWhatsAppSender, never()).send(any(), any(), any(), any());
    }

    @Test
    void sendImmediate_recordsAmbiguous_whenSenderThrowsTimeoutException() {
        when(mockInvoiceRepo.findHistoryItem(42L)).thenReturn(Optional.of(sampleInvoice()));
        when(mockWhatsAppSender.isAvailable()).thenReturn(true);

        InvoicePdfDocument pdfDoc = new InvoicePdfDocument(42L, InvoicePaperFormat.A4, "fake-sha", "dummy-pdf".getBytes());
        when(mockInvoiceRepo.findPdf(42L, InvoicePaperFormat.A4)).thenReturn(Optional.of(pdfDoc));

        InvoiceDeliveryJob job = new InvoiceDeliveryJob(
                104L, UUID.randomUUID(), 42L, InvoiceDeliveryChannel.WHATSAPP, "+919876543210",
                1, Instant.now(), sampleInvoice()
        );

        when(mockDeliveryRepo.prepareImmediateJob(
                eq(42L), eq(InvoiceDeliveryChannel.WHATSAPP), eq("+919876543210"),
                eq(1L), eq("idem-timeout"), eq(true), eq(true), any(InvoiceListItem.class)))
                .thenReturn(new InvoiceDeliveryJdbcRepository.ImmediateClaimResult.Claimed(job));

        when(mockWhatsAppSender.send(any(InvoiceListItem.class), eq("+919876543210"), any(byte[].class), anyString()))
                .thenThrow(new InvoiceDeliveryException(DeliveryFailureKind.AMBIGUOUS, "WHATSAPP_TIMEOUT", "Request timed out"));

        InvoiceDeliveryView ambiguousView = new InvoiceDeliveryView(
                104L, job.deliveryKey(), InvoiceDeliveryChannel.WHATSAPP,
                InvoiceDeliveryStatus.AMBIGUOUS, 1, "+919876543210",
                null, "WHATSAPP_TIMEOUT", "Request timed out", Instant.now(), Instant.now()
        );
        when(mockDeliveryRepo.findLatest(42L, InvoiceDeliveryChannel.WHATSAPP))
                .thenReturn(Optional.of(ambiguousView));

        InvoiceDeliveryView result = service.sendImmediate(admin, 42L, InvoiceDeliveryChannel.WHATSAPP, "idem-timeout", "+919876543210");

        assertThat(result.status()).isEqualTo(InvoiceDeliveryStatus.AMBIGUOUS);
        verify(mockDeliveryRepo).complete(eq(job), eq(InvoiceDeliveryStatus.AMBIGUOUS), isNull(), eq("WHATSAPP_TIMEOUT"), anyString(), isNull());
    }

    @Test
    void sendImmediate_successfullySendsAndTransitionsToProviderAccepted_whenExplicitConsentGranted() {
        when(mockInvoiceRepo.findHistoryItem(42L)).thenReturn(Optional.of(sampleInvoice()));
        when(mockWhatsAppSender.isAvailable()).thenReturn(true);

        InvoicePdfDocument pdfDoc = new InvoicePdfDocument(42L, InvoicePaperFormat.A4, "fake-sha", "dummy-pdf".getBytes());
        when(mockInvoiceRepo.findPdf(42L, InvoicePaperFormat.A4)).thenReturn(Optional.of(pdfDoc));

        InvoiceDeliveryJob job = new InvoiceDeliveryJob(
                105L, UUID.randomUUID(), 42L, InvoiceDeliveryChannel.WHATSAPP, "+919876543210",
                1, Instant.now(), sampleInvoice()
        );

        when(mockDeliveryRepo.prepareImmediateJob(
                eq(42L), eq(InvoiceDeliveryChannel.WHATSAPP), eq("+919876543210"),
                eq(1L), eq("idem-key-2"), eq(true), eq(true), any(InvoiceListItem.class)))
                .thenReturn(new InvoiceDeliveryJdbcRepository.ImmediateClaimResult.Claimed(job));

        when(mockWhatsAppSender.send(any(InvoiceListItem.class), eq("+919876543210"), any(byte[].class), anyString()))
                .thenReturn("wamid.MetaAccepted123");

        InvoiceDeliveryView acceptedView = new InvoiceDeliveryView(
                105L, job.deliveryKey(), InvoiceDeliveryChannel.WHATSAPP,
                InvoiceDeliveryStatus.PROVIDER_ACCEPTED, 1, "+919876543210",
                "wamid.MetaAccepted123", null, null, Instant.now(), Instant.now()
        );
        when(mockDeliveryRepo.findLatest(42L, InvoiceDeliveryChannel.WHATSAPP))
                .thenReturn(Optional.of(acceptedView));

        InvoiceDeliveryView result = service.sendImmediate(admin, 42L, InvoiceDeliveryChannel.WHATSAPP, "idem-key-2", "+919876543210");

        assertThat(result.status()).isEqualTo(InvoiceDeliveryStatus.PROVIDER_ACCEPTED);
        assertThat(result.providerMessageId()).isEqualTo("wamid.MetaAccepted123");

        verify(mockDeliveryRepo).complete(eq(job), eq(InvoiceDeliveryStatus.PROVIDER_ACCEPTED), eq("wamid.MetaAccepted123"), isNull(), isNull(), isNull());
    }
}
