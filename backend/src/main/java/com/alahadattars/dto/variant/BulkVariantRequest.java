package com.alahadattars.dto.variant;

import lombok.Data;
import java.util.List;

@Data
public class BulkVariantRequest {
    private List<CreateVariantRequest> createVariants;
    private List<UpdateVariantRequestWithId> updateVariants;
    private List<Long> deleteVariantIds;
}
