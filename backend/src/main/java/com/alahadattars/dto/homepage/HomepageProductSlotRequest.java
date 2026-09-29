package com.alahadattars.dto.homepage;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class HomepageProductSlotRequest {

    @NotNull(message = "productId is required")
    private Long productId;

    private int displayOrder;

    private boolean enabled = true;
}
