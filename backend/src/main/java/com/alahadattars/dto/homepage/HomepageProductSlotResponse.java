package com.alahadattars.dto.homepage;

import com.alahadattars.dto.product.ProductSummaryResponse;
import com.alahadattars.enums.HomepageProductSection;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HomepageProductSlotResponse {
    private Long id;
    private HomepageProductSection section;
    private int displayOrder;
    private boolean enabled;
    /** Current product data resolved at query time — never stale. */
    private ProductSummaryResponse product;
}
