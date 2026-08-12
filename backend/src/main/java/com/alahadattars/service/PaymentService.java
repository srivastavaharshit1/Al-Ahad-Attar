package com.alahadattars.service;

import com.alahadattars.dto.payment.PaymentOrderRequest;
import com.alahadattars.dto.payment.PaymentResponse;
import com.alahadattars.dto.payment.PaymentVerificationRequest;
import com.alahadattars.dto.payment.RefundResult;

import java.math.BigDecimal;
import java.util.Optional;

public interface PaymentService {
    PaymentResponse createPaymentOrder(String email, PaymentOrderRequest request);
    boolean verifyPayment(PaymentVerificationRequest request);

    /**
     * Initiates a refund via Razorpay for the given payment.
     * @param razorpayPaymentId The Razorpay payment ID (pay_xxx) stored as transactionId.
     * @param amount            The full amount to refund (in INR, not paise).
     * @return RefundResult containing success flag, refundId, or error message.
     */
    RefundResult initiateRefund(String razorpayPaymentId, BigDecimal amount);

    /**
     * Read-only reconciliation against Razorpay's own refund records for a payment — makes no
     * refund request. Used when a prior refund attempt's outcome was never recorded locally (a
     * crash or network timeout after Razorpay may have already accepted it), so a retry can be
     * verified-safe instead of risking a second, genuine refund at Razorpay.
     *
     * @return empty if Razorpay has no matching refund on record yet (outcome genuinely unknown —
     *         callers must not assume success or failure from this); otherwise a definitive
     *         success/failure result reflecting what Razorpay actually has.
     */
    Optional<RefundResult> checkExistingRefund(String razorpayPaymentId, BigDecimal amount);

    /**
     * Verifies and processes an inbound Razorpay webhook call — the independent, async source of
     * truth for payment/refund state that doesn't depend on the customer's browser completing the
     * checkout redirect. Returns false if the signature doesn't verify (caller should respond with
     * a non-2xx so Razorpay retries/flags it); never throws.
     *
     * @param rawPayload the exact raw request body bytes as received, unparsed — signature
     *                    verification is byte-sensitive, so this must not go through any DTO/JSON
     *                    re-serialization first.
     * @param signature   the X-Razorpay-Signature header value.
     */
    boolean handleWebhookEvent(String rawPayload, String signature);
}

