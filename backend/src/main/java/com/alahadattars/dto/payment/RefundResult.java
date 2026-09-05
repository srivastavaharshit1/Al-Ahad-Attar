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
    public enum RefundOutcome {
        SUCCESS,
        PROCESSED,
        DEFINITIVE_FAILURE,
        UNKNOWN_TIMEOUT
    }

    private RefundOutcome outcome;
    private String refundId;
    private String errorMessage;

    public boolean isSuccess() {
        return outcome == RefundOutcome.SUCCESS;
    }
}
