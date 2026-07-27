package com.alahadattars.dto.order;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShippingUpdateRequest {
    private String courierName;
    private String trackingNumber;
    private java.time.LocalDate expectedDeliveryDate;
    private String shipmentNotes;
}
