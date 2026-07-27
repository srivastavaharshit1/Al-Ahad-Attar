package com.alahadattars.dto.variant;

import com.alahadattars.enums.ProductType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateVariantRequest {

    @Schema(description = "Type of product variant", example = "ATTARS")
    private ProductType productType;

    @NotBlank(message = "Size is required")
    @Schema(description = "Size or volume of the variant", example = "3 ml")
    private String size;

    @NotNull(message = "Price is required")
    @PositiveOrZero(message = "Price must be positive or zero")
    @Schema(description = "Price of the variant", example = "500.00")
    private BigDecimal price;

    @NotNull(message = "Stock is required")
    @PositiveOrZero(message = "Stock must be positive or zero")
    @Schema(description = "Available stock", example = "50")
    private Integer stock;

    @NotBlank(message = "SKU is required")
    @Schema(description = "Unique SKU for the variant", example = "ATTAR-OUD-3ML")
    private String sku;

    @Schema(description = "Image URL for the variant", example = "/images/oud-3ml.jpg")
    private String image;

    @Builder.Default
    @Schema(description = "Active status of the variant", example = "true")
    private boolean active = true;
}
