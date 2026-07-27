package com.alahadattars.dto.order;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderRequest {

    @NotNull
    private Long shippingAddressId;

    @NotNull
    private String razorpayOrderId;

    @NotNull
    private String razorpayPaymentId;

    @NotNull
    private String razorpaySignature;

    private String notes;
    
    private String couponCode;

    private Boolean simulatePaymentFailure;

    private Long giftServiceId;

    @jakarta.validation.constraints.Size(max = 250, message = "Gift message cannot exceed 250 characters")
    private String giftMessage;

    @NotEmpty
    @Valid
    private List<OrderItemRequest> items;
}
