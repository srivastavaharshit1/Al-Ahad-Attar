package com.alahadattars.enums;

public enum RefundStatus {
    NOT_REQUIRED,  // Order was cancelled before any payment, or not eligible for refund
    PENDING,       // Cancellation accepted; refund awaiting admin approval
    PROCESSING,    // Admin initiated refund; Razorpay processing
    COMPLETED,     // Razorpay confirmed refund successfully
    FAILED         // Razorpay refund failed; admin can retry
}
