package com.alahadattars.dto.homepage;

import com.alahadattars.dto.product.ProductSummaryResponse;
import com.alahadattars.enums.HomepageProductSection;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Customer-facing response for one carousel section.
 * Only contains enabled slots whose backing product is currently active.
 */
@Data
@Builder
public class HomepageProductSectionResponse {
    private HomepageProductSection section;
    private List<ProductSummaryResponse> products;
}
