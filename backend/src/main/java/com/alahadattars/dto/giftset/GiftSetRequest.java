package com.alahadattars.dto.giftset;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GiftSetRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String slug;

    private String description;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.01", message = "Price must be greater than zero")
    private BigDecimal price;

    @DecimalMin(value = "0.01", message = "Sale price must be greater than zero")
    private BigDecimal salePrice;

    private String packagingNotes;

    @Builder.Default
    private boolean active = true;

    @Builder.Default
    private boolean featured = false;

    private Integer displayOrder;

    @NotEmpty(message = "Gift set must contain at least one item")
    @Valid
    private List<GiftSetItemRequest> items;
}

