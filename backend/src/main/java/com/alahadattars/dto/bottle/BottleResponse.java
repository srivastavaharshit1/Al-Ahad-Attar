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
    private String capacity;
    private String imageUrl;
    private boolean active;


    public static BottleResponse fromEntity(Bottle bottle, com.alahadattars.service.StorageService storageService) {
        if (bottle == null) return null;
        
        String url = bottle.getImageUrl();
        if (storageService != null && url != null) {
            String fileName = url.startsWith("bottles/") ? url.substring(8) : url;
            url = storageService.resolveUrl(url, "/api/bottles/public/images/" + fileName);
        }
        
        return BottleResponse.builder()
                .id(bottle.getId())
                .name(bottle.getName())
                .description(bottle.getDescription())
                .price(bottle.getPrice())
                .capacity(bottle.getCapacity())
                .imageUrl(url)
                .active(bottle.isActive())
                .build();
    }
}
