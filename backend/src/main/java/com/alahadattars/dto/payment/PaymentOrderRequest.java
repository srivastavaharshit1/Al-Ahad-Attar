package com.alahadattars.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentOrderRequest {
    // Deliberately no client-suppliable amount field: the charged amount is always derived
    // server-side from the live cart (PaymentServiceImpl.createPaymentOrder), never trusted from
    // the request — a client-controlled amount here would be a payment-tampering vulnerability.
    private String currency;
    private String receipt;
    private String orderNumber;
    private Boolean isGiftWrapped;
    private String couponCode;
}
