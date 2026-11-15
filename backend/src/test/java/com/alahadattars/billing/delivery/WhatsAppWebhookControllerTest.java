package com.alahadattars.billing.delivery;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class WhatsAppWebhookControllerTest {

    private InvoiceDeliveryService mockDeliveryService;
    private ObjectMapper objectMapper;
    private WhatsAppWebhookController controller;
    private final String testVerifyToken = "my_secret_verify_token_123";
    private final String testAppSecret = "meta_app_secret_xyz789";

    @BeforeEach
    void setUp() {
        mockDeliveryService = mock(InvoiceDeliveryService.class);
        objectMapper = new ObjectMapper();
        controller = new WhatsAppWebhookController(mockDeliveryService, objectMapper, testVerifyToken, testAppSecret);
    }

    private String calculateSignature(byte[] payload, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] bytes = mac.doFinal(payload);
        StringBuilder sb = new StringBuilder("sha256=");
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    @Test
    void verifySubscription_returnsChallenge_whenModeAndTokenMatch() {
        ResponseEntity<String> response = controller.verifySubscription("subscribe", testVerifyToken, "1158201444");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo("1158201444");
    }

    @Test
    void verifySubscription_returnsForbidden_whenTokenDoesNotMatch() {
        ResponseEntity<String> response = controller.verifySubscription("subscribe", "wrong_token", "1158201444");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody()).isEqualTo("Verification failed");
    }

    @Test
    void receiveWebhookEvent_returnsForbidden_whenSignatureIsInvalid() {
        byte[] payload = "{\"test\": true}".getBytes(StandardCharsets.UTF_8);

        ResponseEntity<Map<String, String>> response = controller.receiveWebhookEvent("sha256=invalidhash", payload);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        verifyNoInteractions(mockDeliveryService);
    }

    @Test
    void receiveWebhookEvent_processesDeliveredStatus_whenSignatureValid() throws Exception {
        String payloadJson = """
                {
                  "object": "whatsapp_business_account",
                  "entry": [{
                    "id": "10001",
                    "changes": [{
                      "value": {
                        "messaging_product": "whatsapp",
                        "statuses": [{
                          "id": "wamid.HBgM123456",
                          "status": "delivered",
                          "timestamp": "1731700000",
                          "recipient_id": "919876543210"
                        }]
                      },
                      "field": "messages"
                    }]
                  }]
                }
                """;
        byte[] payloadBytes = payloadJson.getBytes(StandardCharsets.UTF_8);
        String signature = calculateSignature(payloadBytes, testAppSecret);

        ResponseEntity<Map<String, String>> response = controller.receiveWebhookEvent(signature, payloadBytes);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("status", "EVENT_RECEIVED");

        verify(mockDeliveryService).updateStatusFromWebhook("wamid.HBgM123456", InvoiceDeliveryStatus.DELIVERED, null, null);
    }

    @Test
    void receiveWebhookEvent_processesFailedStatus_whenDeliveryFails() throws Exception {
        String payloadJson = """
                {
                  "object": "whatsapp_business_account",
                  "entry": [{
                    "id": "10001",
                    "changes": [{
                      "value": {
                        "messaging_product": "whatsapp",
                        "statuses": [{
                          "id": "wamid.Fail789",
                          "status": "failed",
                          "timestamp": "1731700000",
                          "recipient_id": "919876543210",
                          "errors": [{
                            "code": 131026,
                            "title": "Message undeliverable",
                            "error_data": { "details": "The recipient phone number is not on WhatsApp" }
                          }]
                        }]
                      },
                      "field": "messages"
                    }]
                  }]
                }
                """;
        byte[] payloadBytes = payloadJson.getBytes(StandardCharsets.UTF_8);
        String signature = calculateSignature(payloadBytes, testAppSecret);

        ResponseEntity<Map<String, String>> response = controller.receiveWebhookEvent(signature, payloadBytes);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(mockDeliveryService).updateStatusFromWebhook(
                eq("wamid.Fail789"),
                eq(InvoiceDeliveryStatus.FAILED),
                eq("WHATSAPP_131026"),
                contains("Message undeliverable")
        );
    }
}

