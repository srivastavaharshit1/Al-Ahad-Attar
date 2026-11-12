package com.alahadattars.billing.delivery;

import com.alahadattars.billing.invoice.InvoiceListItem;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Component
public class ResendInvoiceEmailSender implements InvoiceChannelSender {
    private final ObjectMapper objectMapper;
    private final HttpClient client;
    private final String apiKey;
    private final String fromAddress;
    private final boolean enabled;

    public ResendInvoiceEmailSender(
            ObjectMapper objectMapper,
            @Value("${billing.delivery.email.api-key:${resend.api-key:}}") String apiKey,
            @Value("${billing.delivery.email.from:${app.mail.from:}}") String fromAddress,
            @Value("${billing.delivery.email.enabled:false}") boolean enabled) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.fromAddress = fromAddress;
        this.enabled = enabled;
        this.client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }

    @Override
    public InvoiceDeliveryChannel channel() {
        return InvoiceDeliveryChannel.EMAIL;
    }

    @Override
    public boolean isAvailable() {
        return enabled && apiKey != null && !apiKey.isBlank()
                && fromAddress != null && fromAddress.contains("@");
    }

    @Override
    public String send(InvoiceListItem invoice, String destination, byte[] pdf, String deliveryKey) {
        if (!isAvailable()) {
            throw new InvoiceDeliveryException(DeliveryFailureKind.BLOCKED_CONFIGURATION,
                    "EMAIL_NOT_CONFIGURED", "Invoice email delivery is not configured");
        }
        if (destination == null || !destination.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new InvoiceDeliveryException(DeliveryFailureKind.PERMANENT,
                    "INVALID_EMAIL_DESTINATION", "Email destination is invalid");
        }
        if (pdf.length == 0) {
            throw new InvoiceDeliveryException(DeliveryFailureKind.PERMANENT,
                    "EMPTY_PDF", "Invoice PDF is empty");
        }
        try {
            String filename = safeFilename(invoice.invoiceNumber());
            Map<String, Object> attachment = Map.of(
                    "filename", filename + ".pdf",
                    "content", Base64.getEncoder().encodeToString(pdf));
            String payload = objectMapper.writeValueAsString(Map.of(
                    "from", fromAddress,
                    "to", List.of(destination),
                    "subject", "Al Ahad Attars invoice " + invoice.invoiceNumber(),
                    "html", "<p>Your Al Ahad Attars invoice is attached.</p>",
                    "attachments", List.of(attachment)));
            HttpRequest request = HttpRequest.newBuilder(URI.create("https://api.resend.com/emails"))
                    .timeout(Duration.ofSeconds(25))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .header("Idempotency-Key", deliveryKey)
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            classifyHttpFailure(response.statusCode(), "EMAIL_PROVIDER");
            String providerId = objectMapper.readTree(response.body()).path("id").asText("");
            if (providerId.isBlank()) {
                throw new InvoiceDeliveryException(DeliveryFailureKind.AMBIGUOUS,
                        "EMAIL_PROVIDER_RESPONSE", "Email provider accepted a response without a message id");
            }
            return providerId;
        } catch (InvoiceDeliveryException e) {
            throw e;
        } catch (java.net.http.HttpTimeoutException e) {
            throw new InvoiceDeliveryException(DeliveryFailureKind.AMBIGUOUS,
                    "EMAIL_TIMEOUT", "Email request timed out; delivery outcome is uncertain", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new InvoiceDeliveryException(DeliveryFailureKind.AMBIGUOUS,
                    "EMAIL_INTERRUPTED", "Email request was interrupted; delivery outcome is uncertain", e);
        } catch (Exception e) {
            throw new InvoiceDeliveryException(DeliveryFailureKind.AMBIGUOUS,
                    "EMAIL_TRANSPORT", "Email delivery outcome is uncertain", e);
        }
    }

    private static void classifyHttpFailure(int status, String prefix) {
        if (status >= 200 && status < 300) {
            return;
        }
        if (status == 429) {
            throw new InvoiceDeliveryException(DeliveryFailureKind.TRANSIENT,
                    prefix + "_RATE_LIMIT", "Email provider rate limited the request");
        }
        if (status >= 500) {
            throw new InvoiceDeliveryException(DeliveryFailureKind.AMBIGUOUS,
                    prefix + "_SERVER_ERROR", "Email provider returned a server error; delivery outcome is uncertain");
        }
        throw new InvoiceDeliveryException(DeliveryFailureKind.PERMANENT,
                prefix + "_REJECTED", "Email provider rejected the invoice request (HTTP " + status + ")");
    }

    private static String safeFilename(String invoiceNumber) {
        return invoiceNumber.replaceAll("[^A-Za-z0-9._-]", "_");
    }
}
