package com.alahadattars.service;

import com.alahadattars.dto.product.BulkPricingRequest;
import com.alahadattars.entity.User;
import com.alahadattars.enums.BulkPricingStatus;

public interface BulkPriceAuditService {
    void saveAuditRecord(User admin, BulkPricingRequest request, String categoryName, int affected, BulkPricingStatus status);
}
