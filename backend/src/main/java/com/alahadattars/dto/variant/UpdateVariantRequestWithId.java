package com.alahadattars.dto.variant;

import lombok.Data;
import lombok.EqualsAndHashCode;
import jakarta.validation.constraints.NotNull;

@Data
@EqualsAndHashCode(callSuper = true)
public class UpdateVariantRequestWithId extends UpdateVariantRequest {
    @NotNull(message = "Variant ID is required for updates")
    private Long id;
}
