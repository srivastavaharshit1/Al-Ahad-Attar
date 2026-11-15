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

    @org.springframework.beans.factory.annotation.Autowired
    public MetaWhatsAppInvoiceSender(
            ObjectMapper objectMapper,
            @Value("${billing.delivery.whatsapp.api-version:v21.0}") String apiVersion,
            @Value("${billing.delivery.whatsapp.phone-number-id:}") String phoneNumberId,
            @Value("${billing.delivery.whatsapp.access-token:}") String accessToken,
            @Value("${billing.delivery.whatsapp.template-name:pos_invoice_delivery}") String templateName,
            @Value("${billing.delivery.whatsapp.template-language:en_US}") String templateLanguage,
            @Value("${billing.delivery.whatsapp.document-header-approved:false}") boolean approvedDocumentHeaderTemplate,
            @Value("${billing.delivery.whatsapp.enabled:false}") boolean enabled) {
        this(objectMapper, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build(),
                apiVersion, phoneNumberId, accessToken, templateName, templateLanguage,
                approvedDocumentHeaderTemplate, enabled);
    }

    // Visible for testing with mock HttpClient
    public MetaWhatsAppInvoiceSender(
            ObjectMapper objectMapper,
            HttpClient client,
            String apiVersion,
            String phoneNumberId,
            String accessToken,
            String templateName,
            String templateLanguage,
            boolean approvedDocumentHeaderTemplate,
            boolean enabled) {
        this.objectMapper = objectMapper;
        this.client = client;
        this.apiVersion = (apiVersion != null && !apiVersion.isBlank()) ? apiVersion : "v21.0";
        this.phoneNumberId = phoneNumberId;
        this.accessToken = accessToken;
        this.templateName = (templateName != null && !templateName.isBlank()) ? templateName : "pos_invoice_delivery";
        this.templateLanguage = (templateLanguage != null && !templateLanguage.isBlank()) ? templateLanguage : "en_US";
        this.approvedDocumentHeaderTemplate = approvedDocumentHeaderTemplate;
        this.enabled = enabled;
    }

    @Override
    public InvoiceDeliveryChannel channel() {
        return InvoiceDeliveryChannel.WHATSAPP;
    }

    @Override
    public boolean isAvailable() {
        return enabled
                && apiVersion != null && !apiVersion.isBlank()
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
                    "WHATSAPP_NOT_CONFIGURED", "Invoice WhatsApp delivery is not configured on the server");
        }
        String recipient = normalizePhone(destination);
        if (pdf == null || pdf.length == 0) {
            throw new InvoiceDeliveryException(DeliveryFailureKind.PERMANENT,
                    "EMPTY_PDF", "Invoice PDF is empty");
        }
        try {
            String mediaId = uploadPdf(pdf, safeFilename(invoice.invoiceNumber()));

            // Attempt direct document message first (in case customer is within 24-hr customer service window)
            try {
                return sendDirectDocumentMessage(recipient, mediaId, invoice);
            } catch (InvoiceDeliveryException windowClosed) {
                if ("WHATSAPP_WINDOW_CLOSED".equals(windowClosed.errorCode())) {
                    // 24-hour window closed; deliver via pre-approved utility template with document header
                    return sendTemplateDocumentMessage(recipient, mediaId, invoice);
                }
                throw windowClosed;
            }
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
                    "WHATSAPP_TRANSPORT", "WhatsApp delivery outcome is uncertain: " + e.getMessage(), e);
        }
    }

    private String sendDirectDocumentMessage(String recipient, String mediaId, InvoiceListItem invoice) throws Exception {
        String filename = safeFilename(invoice.invoiceNumber()) + ".pdf";
        String customerName = invoice.customerName() != null && !invoice.customerName().isBlank()
                ? invoice.customerName() : "Customer";
        String caption = "Dear " + customerName + ", thank you for shopping at Al Ahad Attars! Your store invoice #"
                + invoice.invoiceNumber() + " is attached.";

        String payload = objectMapper.writeValueAsString(Map.of(
                "messaging_product", "whatsapp",
                "recipient_type", "individual",
                "to", recipient,
                "type", "document",
                "document", Map.of(
                        "id", mediaId,
                        "filename", filename,
                        "caption", caption)));

        HttpResponse<String> response = client.send(HttpRequest.newBuilder(messageUri("/messages"))
                .timeout(Duration.ofSeconds(25))
                .header("Authorization", "Bearer " + accessToken)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build(), HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 400) {
            JsonNode errorNode = parseErrorNode(response.body());
            int code = errorNode.path("code").asInt(0);
            String message = errorNode.path("message").asText("");
            if (code == 131047 || message.contains("131047") || message.toLowerCase().contains("24 hours")) {
                throw new InvoiceDeliveryException(DeliveryFailureKind.TRANSIENT,
                        "WHATSAPP_WINDOW_CLOSED", "Customer service window closed; template required");
            }
        }

        classifyHttpFailure(response.statusCode(), "WHATSAPP_DIRECT_MESSAGE", response.body());
        return extractMessageId(response.body());
    }

    private String sendTemplateDocumentMessage(String recipient, String mediaId, InvoiceListItem invoice) throws Exception {
        String filename = safeFilename(invoice.invoiceNumber()) + ".pdf";
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
                                                "filename", filename))))))));

        HttpResponse<String> response = client.send(HttpRequest.newBuilder(messageUri("/messages"))
                .timeout(Duration.ofSeconds(25))
                .header("Authorization", "Bearer " + accessToken)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(message))
                .build(), HttpResponse.BodyHandlers.ofString());

        classifyHttpFailure(response.statusCode(), "WHATSAPP_TEMPLATE_MESSAGE", response.body());
        return extractMessageId(response.body());
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
        classifyHttpFailure(response.statusCode(), "WHATSAPP_MEDIA", response.body());
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

    public static String normalizePhone(String destination) {
        if (destination == null || destination.isBlank()) {
            throw new InvoiceDeliveryException(DeliveryFailureKind.PERMANENT,
                    "INVALID_WHATSAPP_DESTINATION", "WhatsApp destination must use international E.164 format");
        }
        String cleaned = destination.replaceAll("[^0-9+]", "");
        if (cleaned.startsWith("+")) {
            cleaned = cleaned.substring(1);
        } else if (cleaned.length() == 10) {
            cleaned = "91" + cleaned;
        }
        if (!cleaned.matches("^[1-9][0-9]{7,14}$")) {
            throw new InvoiceDeliveryException(DeliveryFailureKind.PERMANENT,
                    "INVALID_WHATSAPP_DESTINATION", "WhatsApp destination must use international E.164 format");
        }
        return cleaned;
    }

    private static String safeFilename(String invoiceNumber) {
        return invoiceNumber.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private void classifyHttpFailure(int status, String prefix, String responseBody) {
        if (status >= 200 && status < 300) {
            return;
        }
        JsonNode errorNode = parseErrorNode(responseBody);
        String metaMessage = errorNode.path("message").asText("");
        int metaCode = errorNode.path("code").asInt(0);
        String details = metaCode > 0 ? " (" + metaCode + ": " + metaMessage + ")" : (metaMessage.isBlank() ? "" : " - " + metaMessage);

        if (status == 429) {
            throw new InvoiceDeliveryException(DeliveryFailureKind.TRANSIENT,
                    prefix + "_RATE_LIMIT", "WhatsApp provider rate limited the request" + details);
        }
        if (status >= 500) {
            throw new InvoiceDeliveryException(DeliveryFailureKind.AMBIGUOUS,
                    prefix + "_SERVER_ERROR", "WhatsApp provider returned a server error; delivery outcome is uncertain" + details);
        }
        throw new InvoiceDeliveryException(DeliveryFailureKind.PERMANENT,
                prefix + "_REJECTED", "WhatsApp provider rejected the invoice request (HTTP " + status + ")" + details);
    }

    private JsonNode parseErrorNode(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return objectMapper.createObjectNode();
        }
        try {
            return objectMapper.readTree(responseBody).path("error");
        } catch (Exception e) {
            return objectMapper.createObjectNode();
        }
    }

    private String extractMessageId(String responseBody) {
        try {
            JsonNode node = objectMapper.readTree(responseBody).path("messages").path(0).path("id");
            if (node.isMissingNode() || node.asText().isBlank()) {
                throw new InvoiceDeliveryException(DeliveryFailureKind.AMBIGUOUS,
                        "WHATSAPP_PROVIDER_RESPONSE", "WhatsApp accepted a response without a message id");
            }
            return node.asText();
        } catch (InvoiceDeliveryException e) {
            throw e;
        } catch (Exception e) {
            throw new InvoiceDeliveryException(DeliveryFailureKind.AMBIGUOUS,
                    "WHATSAPP_PROVIDER_RESPONSE", "Failed to parse WhatsApp response: " + e.getMessage(), e);
        }
    }
}
