package com.alahadattars.billing.delivery;

import com.alahadattars.billing.invoice.InvoiceListItem;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

@Component
public class MetaWhatsAppInvoiceSender implements InvoiceChannelSender {
    private final ObjectMapper objectMapper;
    private final HttpClient client;
    private final String apiVersion;
    private final String phoneNumberId;
    private final String accessToken;
    private final String templateName;
    private final String templateLanguage;
    private final boolean approvedDocumentHeaderTemplate;
    private final boolean enabled;

    public MetaWhatsAppInvoiceSender(
            ObjectMapper objectMapper,
            @Value("${billing.delivery.whatsapp.api-version:}") String apiVersion,
            @Value("${billing.delivery.whatsapp.phone-number-id:}") String phoneNumberId,
            @Value("${billing.delivery.whatsapp.access-token:}") String accessToken,
            @Value("${billing.delivery.whatsapp.template-name:}") String templateName,
            @Value("${billing.delivery.whatsapp.template-language:}") String templateLanguage,
            @Value("${billing.delivery.whatsapp.document-header-approved:false}") boolean approvedDocumentHeaderTemplate,
            @Value("${billing.delivery.whatsapp.enabled:false}") boolean enabled) {
        this.objectMapper = objectMapper;
        this.apiVersion = apiVersion;
        this.phoneNumberId = phoneNumberId;
        this.accessToken = accessToken;
        this.templateName = templateName;
        this.templateLanguage = templateLanguage;
        this.approvedDocumentHeaderTemplate = approvedDocumentHeaderTemplate;
        this.enabled = enabled;
        this.client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }

    @Override
    public InvoiceDeliveryChannel channel() {
        return InvoiceDeliveryChannel.WHATSAPP;
    }

    @Override
    public boolean isAvailable() {
        return enabled && apiVersion != null && !apiVersion.isBlank()
                && phoneNumberId != null && !phoneNumberId.isBlank()
                && accessToken != null && !accessToken.isBlank()
                && templateName != null && !templateName.isBlank()
                && templateLanguage != null && !templateLanguage.isBlank()
                && approvedDocumentHeaderTemplate;
    }

    @Override
    public String send(InvoiceListItem invoice, String destination, byte[] pdf, String deliveryKey) {
        if (!isAvailable()) {
            throw new InvoiceDeliveryException(DeliveryFailureKind.BLOCKED_CONFIGURATION,
                    "WHATSAPP_NOT_CONFIGURED", "Invoice WhatsApp delivery is not configured");
        }
        String recipient = normalizePhone(destination);
        if (pdf.length == 0) {
            throw new InvoiceDeliveryException(DeliveryFailureKind.PERMANENT,
                    "EMPTY_PDF", "Invoice PDF is empty");
        }
        try {
            String mediaId = uploadPdf(pdf, safeFilename(invoice.invoiceNumber()));
            String message = objectMapper.writeValueAsString(Map.of(
                    "messaging_product", "whatsapp",
                    "to", recipient,
                    "type", "template",
                    "template", Map.of(
                            "name", templateName,
                            "language", Map.of("code", templateLanguage),
                            "components", java.util.List.of(Map.of(
                                    "type", "header",
                                    "parameters", java.util.List.of(Map.of(
                                            "type", "document",
                                            "document", Map.of(
                                                    "id", mediaId,
                                                    "filename", safeFilename(invoice.invoiceNumber()) + ".pdf"))))))));
            HttpResponse<String> response = client.send(HttpRequest.newBuilder(messageUri("/messages"))
                    .timeout(Duration.ofSeconds(25))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(message))
                    .build(), HttpResponse.BodyHandlers.ofString());
            classifyHttpFailure(response.statusCode(), "WHATSAPP_MESSAGE");
            JsonNode node = objectMapper.readTree(response.body()).path("messages").path(0).path("id");
            if (node.isMissingNode() || node.asText().isBlank()) {
                throw new InvoiceDeliveryException(DeliveryFailureKind.AMBIGUOUS,
                        "WHATSAPP_PROVIDER_RESPONSE", "WhatsApp accepted a response without a message id");
            }
            return node.asText();
        } catch (InvoiceDeliveryException e) {
            throw e;
        } catch (java.net.http.HttpTimeoutException e) {
            throw new InvoiceDeliveryException(DeliveryFailureKind.AMBIGUOUS,
                    "WHATSAPP_TIMEOUT", "WhatsApp request timed out; delivery outcome is uncertain", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new InvoiceDeliveryException(DeliveryFailureKind.AMBIGUOUS,
                    "WHATSAPP_INTERRUPTED", "WhatsApp request was interrupted; delivery outcome is uncertain", e);
        } catch (Exception e) {
            throw new InvoiceDeliveryException(DeliveryFailureKind.AMBIGUOUS,
                    "WHATSAPP_TRANSPORT", "WhatsApp delivery outcome is uncertain", e);
        }
    }

    private String uploadPdf(byte[] pdf, String filename) throws Exception {
        String boundary = "----AlAhadBilling" + java.util.UUID.randomUUID().toString().replace("-", "");
        ByteArrayOutputStream body = new ByteArrayOutputStream(pdf.length + 1024);
        writePart(body, boundary, "messaging_product", null, "whatsapp".getBytes(StandardCharsets.UTF_8));
        writePart(body, boundary, "type", null, "application/pdf".getBytes(StandardCharsets.UTF_8));
        writePart(body, boundary, "file", filename + ".pdf", pdf);
        body.write(("--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        HttpResponse<String> response = client.send(HttpRequest.newBuilder(messageUri("/media"))
                .timeout(Duration.ofSeconds(35))
                .header("Authorization", "Bearer " + accessToken)
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofByteArray(body.toByteArray()))
                .build(), HttpResponse.BodyHandlers.ofString());
        classifyHttpFailure(response.statusCode(), "WHATSAPP_MEDIA");
        String mediaId = objectMapper.readTree(response.body()).path("id").asText("");
        if (mediaId.isBlank()) {
            throw new InvoiceDeliveryException(DeliveryFailureKind.PERMANENT,
                    "WHATSAPP_MEDIA_RESPONSE", "WhatsApp did not return a media id");
        }
        return mediaId;
    }

    private URI messageUri(String suffix) {
        return URI.create("https://graph.facebook.com/" + apiVersion + "/" + phoneNumberId + suffix);
    }

    private static void writePart(ByteArrayOutputStream out, String boundary, String name, String filename, byte[] value)
            throws java.io.IOException {
        out.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
        if (filename == null) {
            out.write(("Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        } else {
            out.write(("Content-Disposition: form-data; name=\"" + name + "\"; filename=\"" + filename + "\"\r\n"
                    + "Content-Type: application/pdf\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        }
        out.write(value);
        out.write("\r\n".getBytes(StandardCharsets.UTF_8));
    }

    private static String normalizePhone(String destination) {
        if (destination == null || !destination.matches("^\\+[1-9][0-9]{7,14}$")) {
            throw new InvoiceDeliveryException(DeliveryFailureKind.PERMANENT,
                    "INVALID_WHATSAPP_DESTINATION", "WhatsApp destination must use international E.164 format");
        }
        return destination.substring(1);
    }

    private static String safeFilename(String invoiceNumber) {
        return invoiceNumber.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private static void classifyHttpFailure(int status, String prefix) {
        if (status >= 200 && status < 300) {
            return;
        }
        if (status == 429) {
            throw new InvoiceDeliveryException(DeliveryFailureKind.TRANSIENT,
                    prefix + "_RATE_LIMIT", "WhatsApp provider rate limited the request");
        }
        if (status >= 500) {
            throw new InvoiceDeliveryException(DeliveryFailureKind.AMBIGUOUS,
                    prefix + "_SERVER_ERROR", "WhatsApp provider returned a server error; delivery outcome is uncertain");
        }
        throw new InvoiceDeliveryException(DeliveryFailureKind.PERMANENT,
                prefix + "_REJECTED", "WhatsApp provider rejected the invoice request (HTTP " + status + ")");
    }
}
