package com.alahadattars.billing.delivery;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/billing/webhooks/whatsapp")
public class WhatsAppWebhookController {

    private final InvoiceDeliveryService deliveryService;
    private final ObjectMapper objectMapper;
    private final String verifyToken;
    private final String appSecret;

    public WhatsAppWebhookController(
            InvoiceDeliveryService deliveryService,
            ObjectMapper objectMapper,
            @Value("${billing.delivery.whatsapp.webhook.verify-token:}") String verifyToken,
            @Value("${billing.delivery.whatsapp.webhook.app-secret:}") String appSecret) {
        this.deliveryService = deliveryService;
        this.objectMapper = objectMapper;
        this.verifyToken = verifyToken;
        this.appSecret = appSecret;
    }

    @GetMapping(produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> verifySubscription(
            @RequestParam(value = "hub.mode", required = false) String mode,
            @RequestParam(value = "hub.verify_token", required = false) String token,
            @RequestParam(value = "hub.challenge", required = false) String challenge) {
        if ("subscribe".equalsIgnoreCase(mode)
                && verifyToken != null && !verifyToken.isBlank()
                && verifyToken.equals(token)) {
            log.info("Meta WhatsApp webhook subscription verified successfully");
            return ResponseEntity.ok(challenge != null ? challenge : "");
        }
        log.warn("Meta WhatsApp webhook subscription verification failed: mode={}, tokenMatch={}",
                mode, (verifyToken != null && verifyToken.equals(token)));
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Verification failed");
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, String>> receiveWebhookEvent(
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature,
            @RequestBody byte[] rawPayload) {
        if (appSecret == null || appSecret.isBlank()) {
            log.warn("WhatsApp webhook event rejected: app-secret is not configured");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Webhook secret not configured"));
        }
        if (signature == null || !isValidSignature(rawPayload, signature, appSecret)) {
            log.warn("WhatsApp webhook event rejected: invalid or missing HMAC-SHA256 signature");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Invalid signature"));
        }

        try {
            processPayload(rawPayload);
            return ResponseEntity.ok(Map.of("status", "EVENT_RECEIVED"));
        } catch (Exception e) {
            log.error("Failed to process WhatsApp webhook payload", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to process webhook event: " + e.getMessage()));
        }
    }

    public static boolean isValidSignature(byte[] payload, String signatureHeader, String appSecret) {
        if (signatureHeader == null || !signatureHeader.startsWith("sha256=") || appSecret == null || appSecret.isBlank()) {
            return false;
        }
        String expectedHash = signatureHeader.substring(7);
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(appSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hmacBytes = mac.doFinal(payload);
            StringBuilder sb = new StringBuilder();
            for (byte b : hmacBytes) {
                sb.append(String.format("%02x", b));
            }
            String computedHash = sb.toString();
            return MessageDigest.isEqual(
                    computedHash.getBytes(StandardCharsets.UTF_8),
                    expectedHash.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.error("Failed to compute HMAC-SHA256 for WhatsApp webhook", e);
            return false;
        }
    }

    private void processPayload(byte[] rawPayload) throws Exception {
        JsonNode root = objectMapper.readTree(rawPayload);
        JsonNode entries = root.path("entry");
        if (!entries.isArray()) {
            return;
        }
        for (JsonNode entry : entries) {
            JsonNode changes = entry.path("changes");
            if (!changes.isArray()) {
                continue;
            }
            for (JsonNode change : changes) {
                JsonNode value = change.path("value");
                JsonNode statuses = value.path("statuses");
                if (statuses.isArray()) {
                    for (JsonNode statusNode : statuses) {
                        String messageId = statusNode.path("id").asText(null);
                        String status = statusNode.path("status").asText("");
                        if (messageId != null && !messageId.isBlank()) {
                            handleStatus(messageId, status, statusNode);
                        }
                    }
                }
            }
        }
    }

    private void handleStatus(String messageId, String status, JsonNode statusNode) {
        if ("delivered".equalsIgnoreCase(status)) {
            log.info("WhatsApp delivery confirmed delivered for provider_message_id={}", messageId);
            deliveryService.updateStatusFromWebhook(messageId, InvoiceDeliveryStatus.DELIVERED, null, null);
        } else if ("failed".equalsIgnoreCase(status)) {
            JsonNode errors = statusNode.path("errors");
            String errorCode = "WHATSAPP_DELIVERY_FAILED";
            String errorSummary = "Message delivery failed";
            if (errors.isArray() && !errors.isEmpty()) {
                JsonNode first = errors.get(0);
                int code = first.path("code").asInt(0);
                String title = first.path("title").asText("");
                String details = first.path("error_data").path("details").asText("");
                errorCode = code > 0 ? "WHATSAPP_" + code : errorCode;
                errorSummary = !title.isBlank() ? title + (!details.isBlank() ? ": " + details : "") : errorSummary;
            }
            log.warn("WhatsApp delivery failed for provider_message_id={}: {} - {}", messageId, errorCode, errorSummary);
            deliveryService.updateStatusFromWebhook(messageId, InvoiceDeliveryStatus.FAILED, errorCode, errorSummary);
        } else if ("sent".equalsIgnoreCase(status)) {
            deliveryService.updateStatusFromWebhook(messageId, InvoiceDeliveryStatus.PROVIDER_ACCEPTED, null, null);
        }
    }
}

