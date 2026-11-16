package com.alahadattars.billing.delivery;

import com.alahadattars.billing.invoice.InvoiceChannel;
import com.alahadattars.billing.invoice.InvoiceListItem;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MetaWhatsAppInvoiceSenderTest {

    private ObjectMapper objectMapper;
    private HttpClient mockClient;
    private HttpResponse<String> mockResponse;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        objectMapper = new ObjectMapper();
        mockClient = mock(HttpClient.class);
        mockResponse = mock(HttpResponse.class);
    }

    private InvoiceListItem sampleInvoice() {
        return new InvoiceListItem(
                42L,
                UUID.randomUUID(),
                "POS-2026-27-00042",
                InvoiceChannel.POS,
                "Harshit Srivastava",
                new BigDecimal("1250.00"),
                Instant.now()
        );
    }

    @Test
    void isAvailable_returnsFalse_whenDisabledOrMissingCredentials() {
        MetaWhatsAppInvoiceSender sender = new MetaWhatsAppInvoiceSender(
                objectMapper, mockClient, "v21.0", "", "", "pos_invoice_delivery", "en_US", false, false
        );
        assertThat(sender.isAvailable()).isFalse();

        MetaWhatsAppInvoiceSender missingToken = new MetaWhatsAppInvoiceSender(
                objectMapper, mockClient, "v21.0", "1234567890", "", "pos_invoice_delivery", "en_US", true, true
        );
        assertThat(missingToken.isAvailable()).isFalse();

        MetaWhatsAppInvoiceSender unapproved = new MetaWhatsAppInvoiceSender(
                objectMapper, mockClient, "v21.0", "1234567890", "token123", "pos_invoice_delivery", "en_US", false, true
        );
        assertThat(unapproved.isAvailable()).isFalse();
    }

    @Test
    void isAvailable_returnsTrue_whenFullyConfigured() {
        MetaWhatsAppInvoiceSender sender = new MetaWhatsAppInvoiceSender(
                objectMapper, mockClient, "v21.0", "1234567890", "token123", "pos_invoice_delivery", "en_US", true, true
        );
        assertThat(sender.isAvailable()).isTrue();
    }

    @Test
    void send_throwsBlockedConfiguration_whenUnavailable() {
        MetaWhatsAppInvoiceSender sender = new MetaWhatsAppInvoiceSender(
                objectMapper, mockClient, "v21.0", "", "", "pos_invoice_delivery", "en_US", false, false
        );
        assertThatThrownBy(() -> sender.send(sampleInvoice(), "+919876543210", new byte[]{1, 2, 3}, "del-key"))
                .isInstanceOf(InvoiceDeliveryException.class)
                .hasMessageContaining("not configured");
    }

    @Test
    void send_directMessageSuccess_whenWithin24HrCustomerServiceWindow() throws Exception {
        MetaWhatsAppInvoiceSender sender = new MetaWhatsAppInvoiceSender(
                objectMapper, mockClient, "v21.0", "1234567890", "token123", "pos_invoice_delivery", "en_US", true, true
        );

        // 1st request: media upload -> returns id "media_999"
        HttpResponse<String> mediaResp = mock(HttpResponse.class);
        when(mediaResp.statusCode()).thenReturn(200);
        when(mediaResp.body()).thenReturn("{\"id\": \"media_999\"}");

        // 2nd request: direct document message -> returns message id "wamid.HBg123"
        HttpResponse<String> msgResp = mock(HttpResponse.class);
        when(msgResp.statusCode()).thenReturn(200);
        when(msgResp.body()).thenReturn("{\"messages\": [{\"id\": \"wamid.HBg123\"}]}");

        when(mockClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mediaResp)
                .thenReturn(msgResp);

        String providerMessageId = sender.send(sampleInvoice(), "+919876543210", "dummy-pdf".getBytes(), "key-1");

        assertThat(providerMessageId).isEqualTo("wamid.HBg123");
        verify(mockClient, times(2)).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    @Test
    void send_fallsBackToApprovedUtilityTemplate_whenDirectMessageReportsWindowClosed() throws Exception {
        MetaWhatsAppInvoiceSender sender = new MetaWhatsAppInvoiceSender(
                objectMapper, mockClient, "v21.0", "1234567890", "token123", "pos_invoice_delivery", "en_US", true, true
        );

        // 1st request: media upload -> returns id "media_999"
        HttpResponse<String> mediaResp = mock(HttpResponse.class);
        when(mediaResp.statusCode()).thenReturn(200);
        when(mediaResp.body()).thenReturn("{\"id\": \"media_999\"}");

        // 2nd request: direct document message -> returns HTTP 400 with code 131047 (window closed)
        HttpResponse<String> windowClosedResp = mock(HttpResponse.class);
        when(windowClosedResp.statusCode()).thenReturn(400);
        when(windowClosedResp.body()).thenReturn("""
                {
                  "error": {
                    "message": "(#131047) Re-engagement message",
                    "code": 131047,
                    "error_data": { "details": "Message failed to send because more than 24 hours have passed" }
                  }
                }
                """);

        // 3rd request: template document message -> returns 200 with message id "wamid.TemplateAccepted456"
        HttpResponse<String> templateResp = mock(HttpResponse.class);
        when(templateResp.statusCode()).thenReturn(200);
        when(templateResp.body()).thenReturn("{\"messages\": [{\"id\": \"wamid.TemplateAccepted456\"}]}");

        when(mockClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mediaResp)
                .thenReturn(windowClosedResp)
                .thenReturn(templateResp);

        String providerMessageId = sender.send(sampleInvoice(), "9876543210", "dummy-pdf".getBytes(), "key-2");

        assertThat(providerMessageId).isEqualTo("wamid.TemplateAccepted456");
        verify(mockClient, times(3)).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    @Test
    void normalizePhone_normalizesIndianAndInternationalFormats() {
        assertThat(MetaWhatsAppInvoiceSender.normalizePhone("+919876543210")).isEqualTo("919876543210");
        assertThat(MetaWhatsAppInvoiceSender.normalizePhone("9876543210")).isEqualTo("919876543210");
        assertThat(MetaWhatsAppInvoiceSender.normalizePhone("919876543210")).isEqualTo("919876543210");
        assertThat(MetaWhatsAppInvoiceSender.normalizePhone("+91 98765-43210")).isEqualTo("919876543210");
        assertThat(MetaWhatsAppInvoiceSender.normalizePhone("+14155552671")).isEqualTo("14155552671");
        assertThat(MetaWhatsAppInvoiceSender.normalizePhone("+971 50 123 4567")).isEqualTo("971501234567");

        // Leading zero rejected
        assertThatThrownBy(() -> MetaWhatsAppInvoiceSender.normalizePhone("09876543210"))
                .isInstanceOf(InvoiceDeliveryException.class)
                .hasMessageContaining("must not start with 0");

        // 10-digit not starting with 6, 7, 8, or 9 rejected
        assertThatThrownBy(() -> MetaWhatsAppInvoiceSender.normalizePhone("1234567890"))
                .isInstanceOf(InvoiceDeliveryException.class)
                .hasMessageContaining("must start with 6, 7, 8, or 9");

        // Indian +91 with invalid national mobile rejected
        assertThatThrownBy(() -> MetaWhatsAppInvoiceSender.normalizePhone("+911234567890"))
                .isInstanceOf(InvoiceDeliveryException.class)
                .hasMessageContaining("starting with 6-9");

        // Ambiguous digits without + rejected
        assertThatThrownBy(() -> MetaWhatsAppInvoiceSender.normalizePhone("1234567890123"))
                .isInstanceOf(InvoiceDeliveryException.class)
                .hasMessageContaining("Ambiguous destination format");

        // Too short rejected
        assertThatThrownBy(() -> MetaWhatsAppInvoiceSender.normalizePhone("123"))
                .isInstanceOf(InvoiceDeliveryException.class);

        // Invalid characters rejected
        assertThatThrownBy(() -> MetaWhatsAppInvoiceSender.normalizePhone("+91-98765-abc"))
                .isInstanceOf(InvoiceDeliveryException.class)
                .hasMessageContaining("invalid characters");
    }
}

