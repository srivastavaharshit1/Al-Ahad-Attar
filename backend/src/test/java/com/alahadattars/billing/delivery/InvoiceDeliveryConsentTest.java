package com.alahadattars.billing.delivery;

import com.alahadattars.billing.invoice.InvoiceChannel;
import com.alahadattars.billing.invoice.InvoiceJdbcRepository;
import com.alahadattars.billing.invoice.InvoiceListItem;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class InvoiceDeliveryConsentTest {
    @Test
    void revokedOrMissingConsentStopsBothChannelsBeforeCallingProvider() {
        InvoiceJdbcRepository invoiceRepository = mock(InvoiceJdbcRepository.class);
        InvoiceDeliveryJdbcRepository deliveryRepository = mock(InvoiceDeliveryJdbcRepository.class);
        InvoiceChannelSender emailSender = mock(InvoiceChannelSender.class);
        when(emailSender.channel()).thenReturn(InvoiceDeliveryChannel.EMAIL);
        when(emailSender.isAvailable()).thenReturn(true);
        InvoiceListItem invoice = new InvoiceListItem(11, UUID.randomUUID(), "WEB-FY-1", InvoiceChannel.ONLINE,
                "Synthetic", new BigDecimal("100.00"), Instant.parse("2026-11-12T00:00:00Z"));
        InvoiceDeliveryJob job = new InvoiceDeliveryJob(21, UUID.randomUUID(), 11,
                InvoiceDeliveryChannel.EMAIL, "customer@example.test", 1,
                Instant.parse("2026-11-12T00:00:01Z"), invoice);
        when(deliveryRepository.claimDue(20, InvoiceDeliveryRetryPolicy.MAX_ATTEMPTS)).thenReturn(List.of(job));
        when(deliveryRepository.consentStillGranted(11, InvoiceDeliveryChannel.EMAIL, "customer@example.test"))
                .thenReturn(false);

        InvoiceDeliveryService service = new InvoiceDeliveryService(invoiceRepository, deliveryRepository,
                List.of(emailSender), new InvoiceConsentPolicyProvider("", "", "", ""));
        service.processDueDeliveries(20);

        ArgumentCaptor<InvoiceDeliveryStatus> result = ArgumentCaptor.forClass(InvoiceDeliveryStatus.class);
        verify(deliveryRepository).complete(eq(job), result.capture(), isNull(), eq("CONSENT_REVOKED"), anyString(), isNull());
        assertEquals(InvoiceDeliveryStatus.SKIPPED_NO_CONSENT, result.getValue());
        verify(emailSender, never()).isAvailable();
        verify(emailSender, never()).send(any(InvoiceListItem.class), anyString(), any(byte[].class), anyString());
        verifyNoInteractions(invoiceRepository);
    }

    @Test
    void whatsAppSenderRequiresExplicitApprovedDocumentHeaderGate() {
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        MetaWhatsAppInvoiceSender unapproved = new MetaWhatsAppInvoiceSender(mapper, "v22.0", "phone-id", "token",
                "approved_template_name", "en", false, true);
        MetaWhatsAppInvoiceSender approved = new MetaWhatsAppInvoiceSender(mapper, "v22.0", "phone-id", "token",
                "approved_template_name", "en", true, true);

        org.junit.jupiter.api.Assertions.assertFalse(unapproved.isAvailable());
        org.junit.jupiter.api.Assertions.assertTrue(approved.isAvailable());
    }
}
