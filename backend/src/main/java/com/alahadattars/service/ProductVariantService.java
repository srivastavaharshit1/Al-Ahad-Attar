package com.alahadattars.service;

import com.alahadattars.dto.variant.CreateVariantRequest;
import com.alahadattars.dto.variant.UpdateVariantRequest;
import com.alahadattars.dto.variant.VariantResponse;
import com.alahadattars.dto.variant.VariantSummaryResponse;

import java.util.List;

public interface ProductVariantService {
    VariantResponse createVariant(Long productId, CreateVariantRequest request);
    VariantResponse updateVariant(Long id, UpdateVariantRequest request);
    void deleteVariant(Long id);
    VariantResponse getVariantById(Long id);
    List<VariantSummaryResponse> getVariantsByProduct(Long productId);
    void updateStock(Long id, Integer stock);
    void updateStatus(Long id, Boolean active);
}
