package com.alahadattars.dto.gift;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GiftServiceRequest {

    @NotBlank(message = "Gift service name is required")
    @Size(max = 200)
    private String name;

    @Size(max = 2000)
    private String description;

    @Size(max = 500)
    private String imageUrl;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Price cannot be negative")
    private BigDecimal price;

    @Builder.Default
    private boolean active = true;

    @Builder.Default
    private int sortOrder = 0;
}
