package com.alahadattars.dto.product;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductImageResponse {
    private Long id;
    private String imageUrl;
    private Integer displayOrder;

    // Lombok's boolean-getter naming for a field already prefixed "is" produces isPrimary()
    // (not isIsPrimary()) — but Jackson then strips that "is" prefix from the *getter name*
    // to derive the property name, serializing this as "primary", not "isPrimary". The
    // frontend (types/product.ts, ImageManager.tsx) reads response.isPrimary, so that
    // mismatch would silently make every image look non-primary. Suppressing the Lombok
    // getter and naming the real one getIsPrimary() sidesteps the "is"-stripping rule
    // entirely (it only applies to isXxx() getters, not getXxx()), so Jackson deterministically
    // serializes this as "isPrimary" with no ambiguity.
    @Getter(AccessLevel.NONE)
    private boolean isPrimary;

    private String altText;
    private Integer width;
    private Integer height;
    private String format;

    public boolean getIsPrimary() {
        return isPrimary;
    }
}
