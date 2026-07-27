package com.alahadattars.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentOrderRequest {
    private BigDecimal amount;
    private String currency;
    private String receipt;
    private String orderNumber;
    private Long giftServiceId;
    private String couponCode;
}
