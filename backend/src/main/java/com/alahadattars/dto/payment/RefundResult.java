package com.alahadattars.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Internal DTO wrapping the result of a Razorpay refund API call.
 * Not exposed directly as an HTTP response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundResult {
    private boolean success;
    private String refundId;
    private String errorMessage;
}
