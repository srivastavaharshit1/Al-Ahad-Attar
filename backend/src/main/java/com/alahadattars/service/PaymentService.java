package com.alahadattars.service;

import com.alahadattars.dto.payment.PaymentOrderRequest;
import com.alahadattars.dto.payment.PaymentResponse;
import com.alahadattars.dto.payment.PaymentVerificationRequest;
import com.alahadattars.dto.payment.RefundResult;

import java.math.BigDecimal;

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
}

