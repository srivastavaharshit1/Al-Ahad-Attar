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
    void sendImmediate_recordsBlockedConfiguration_whenSenderNotAvailable() {
        when(mockInvoiceRepo.findHistoryItem(42L)).thenReturn(Optional.of(sampleInvoice()));
        when(mockWhatsAppSender.isAvailable()).thenReturn(false);

        InvoiceDeliveryView blockedView = new InvoiceDeliveryView(
                100L, UUID.randomUUID(), InvoiceDeliveryChannel.WHATSAPP,
                InvoiceDeliveryStatus.BLOCKED_CONFIGURATION, 0, "+919876543210",
                null, "WHATSAPP_NOT_CONFIGURED", "Invoice WhatsApp delivery is not configured on the server",
                Instant.now(), Instant.now()
        );
        when(mockDeliveryRepo.recordBlockedConfiguration(eq(42L), eq(InvoiceDeliveryChannel.WHATSAPP),
                eq("+919876543210"), eq(1L), eq("idem-key-1"), anyString(), anyString()))
                .thenReturn(blockedView);

        InvoiceDeliveryView result = service.sendImmediate(admin, 42L, InvoiceDeliveryChannel.WHATSAPP, "idem-key-1", "9876543210");

        assertThat(result.status()).isEqualTo(InvoiceDeliveryStatus.BLOCKED_CONFIGURATION);
        assertThat(result.lastErrorCode()).isEqualTo("WHATSAPP_NOT_CONFIGURED");
        verify(mockWhatsAppSender, never()).send(any(), any(), any(), any());
    }

    @Test
    void sendImmediate_successfullySendsAndTransitionsToProviderAccepted() {
        when(mockInvoiceRepo.findHistoryItem(42L)).thenReturn(Optional.of(sampleInvoice()));
        when(mockWhatsAppSender.isAvailable()).thenReturn(true);

        InvoicePdfDocument pdfDoc = new InvoicePdfDocument(42L, InvoicePaperFormat.A4, "fake-sha", "dummy-pdf".getBytes());
        when(mockInvoiceRepo.findPdf(42L, InvoicePaperFormat.A4)).thenReturn(Optional.of(pdfDoc));

        InvoiceDeliveryJob job = new InvoiceDeliveryJob(
                101L, UUID.randomUUID(), 42L, InvoiceDeliveryChannel.WHATSAPP, "+919876543210",
                1, Instant.now(), sampleInvoice()
        );
        when(mockDeliveryRepo.createOrClaimImmediateJob(eq(42L), eq(InvoiceDeliveryChannel.WHATSAPP),
                eq("+919876543210"), eq(1L), eq("idem-key-2"), any(InvoiceListItem.class)))
                .thenReturn(job);

        when(mockWhatsAppSender.send(any(InvoiceListItem.class), eq("+919876543210"), any(byte[].class), anyString()))
                .thenReturn("wamid.MetaAccepted123");

        InvoiceDeliveryView acceptedView = new InvoiceDeliveryView(
                101L, job.deliveryKey(), InvoiceDeliveryChannel.WHATSAPP,
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
