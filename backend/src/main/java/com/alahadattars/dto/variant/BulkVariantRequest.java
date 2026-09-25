package com.alahadattars.dto.variant;

import lombok.Data;
import jakarta.validation.Valid;
import java.util.List;

@Data
public class BulkVariantRequest {
    @Valid
    private List<CreateVariantRequest> createVariants;
    
    @Valid
    private List<UpdateVariantRequestWithId> updateVariants;
    
    private List<Long> deleteVariantIds;
}
