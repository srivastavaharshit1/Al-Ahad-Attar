package com.alahadattars.controller;

import com.alahadattars.dto.payment.PaymentOrderRequest;
import com.alahadattars.dto.payment.PaymentResponse;
import com.alahadattars.dto.payment.PaymentVerificationRequest;
import com.alahadattars.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;

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
            return ResponseEntity.status(503).body(new ErrorResponse("Unable to initialize secure payment. Payment service is temporarily unavailable."));
        }
    }

    @PostMapping("/verify")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Boolean> verifyPayment(@RequestBody PaymentVerificationRequest request) {
        boolean isValid = paymentService.verifyPayment(request);
        return ResponseEntity.ok(isValid);
    }
    
    // Simple record for sending JSON error response
    public record ErrorResponse(String message) {}
}
