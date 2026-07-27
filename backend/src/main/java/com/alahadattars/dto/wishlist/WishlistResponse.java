package com.alahadattars.dto.wishlist;

import com.alahadattars.dto.variant.VariantResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WishlistResponse {

    private Long id;
    private VariantResponse variant;
    private LocalDateTime createdAt;
}
