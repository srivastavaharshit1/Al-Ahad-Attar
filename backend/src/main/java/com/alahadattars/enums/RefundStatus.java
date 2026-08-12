package com.alahadattars.enums;

public enum RefundStatus {
    NOT_REQUIRED,     // Order was cancelled before any payment, or not eligible for refund
    REFUND_REQUIRED,  // Cancellation accepted; refund awaiting admin approval (admin controls the actual Razorpay call)
    PROCESSING,       // Admin initiated refund; Razorpay processing
    REFUNDED,         // Razorpay confirmed refund successfully
    FAILED            // Razorpay refund failed, or outcome unconfirmed; admin can retry/reconcile
}
