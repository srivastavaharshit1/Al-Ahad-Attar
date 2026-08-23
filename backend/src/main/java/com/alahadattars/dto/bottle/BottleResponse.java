package com.alahadattars.dto.bottle;

import com.alahadattars.entity.Bottle;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BottleResponse {
    private Long id;
    private String name;
    private String description;
    private BigDecimal price;
    private String imageUrl;
    private boolean active;

    public static BottleResponse fromEntity(Bottle bottle) {
        if (bottle == null) return null;
        return BottleResponse.builder()
                .id(bottle.getId())
                .name(bottle.getName())
                .description(bottle.getDescription())
                .price(bottle.getPrice())
                .imageUrl(bottle.getImageUrl())
                .active(bottle.isActive())
                .build();
    }
}
