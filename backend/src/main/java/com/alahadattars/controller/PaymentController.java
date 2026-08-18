package com.alahadattars.controller;

import com.alahadattars.dto.payment.PaymentOrderRequest;
import com.alahadattars.dto.payment.PaymentResponse;
import com.alahadattars.dto.payment.PaymentVerificationRequest;
import com.alahadattars.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;

@Slf4j
@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/create")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> createPaymentOrder(@RequestBody PaymentOrderRequest request, Principal principal) {
        try {
            return ResponseEntity.ok(paymentService.createPaymentOrder(principal.getName(), request));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(400).body(new ErrorResponse(e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to initialize Razorpay payment", e);
            return ResponseEntity.status(503).body(new ErrorResponse("Unable to initialize secure payment. Payment service is temporarily unavailable."));
        }
    }

    @PostMapping("/verify")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Boolean> verifyPayment(@RequestBody PaymentVerificationRequest request) {
        boolean isValid = paymentService.verifyPayment(request);
        return ResponseEntity.ok(isValid);
    }

    /**
     * Razorpay calls this directly (no JWT — it's not our user), so it's permitAll in
     * SecurityConfig. Authenticity instead comes entirely from the X-Razorpay-Signature check
     * inside handleWebhookEvent, verified against RAZORPAY_WEBHOOK_SECRET (a signing secret, not a
     * credential Razorpay ever sends back to us) — the body must be read as a raw String, not a
     * parsed DTO, since signature verification is byte-sensitive.
     */
    @PostMapping("/webhook")
    public ResponseEntity<?> handleWebhook(@RequestBody String rawPayload,
                                            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {
        if (signature == null) {
            log.warn("Rejected Razorpay webhook call: missing X-Razorpay-Signature header.");
            return ResponseEntity.badRequest().body(new ErrorResponse("Missing signature"));
        }
        boolean accepted = paymentService.handleWebhookEvent(rawPayload, signature);
        return accepted ? ResponseEntity.ok().build() : ResponseEntity.status(400).body(new ErrorResponse("Signature verification failed"));
    }

    // Simple record for sending JSON error response
    public record ErrorResponse(String message) {}
}
