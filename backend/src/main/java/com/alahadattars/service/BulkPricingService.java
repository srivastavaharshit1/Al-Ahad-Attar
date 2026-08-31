package com.alahadattars.service;

import com.alahadattars.dto.product.BulkPricingApplyResponse;
import com.alahadattars.dto.product.BulkPricingPreviewResponse;
import com.alahadattars.dto.product.BulkPricingRequest;
import com.alahadattars.entity.BulkPriceAudit;
import com.alahadattars.entity.User;

import java.util.List;

public interface BulkPricingService {
    BulkPricingPreviewResponse preview(BulkPricingRequest request);
    BulkPricingApplyResponse apply(BulkPricingRequest request, User admin);
    List<BulkPriceAudit> getHistory();
}
