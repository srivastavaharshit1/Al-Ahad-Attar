package com.alahadattars.service.impl;

import com.alahadattars.dto.product.BulkPricingRequest;
import com.alahadattars.entity.BulkPriceAudit;
import com.alahadattars.entity.User;
import com.alahadattars.enums.BulkPricingStatus;
import com.alahadattars.repository.BulkPriceAuditRepository;
import com.alahadattars.service.BulkPriceAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class BulkPriceAuditServiceImpl implements BulkPriceAuditService {

    private final BulkPriceAuditRepository auditRepository;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveAuditRecord(User admin, BulkPricingRequest request, String categoryName, int affected, BulkPricingStatus status) {
        BigDecimal safeValue = request.getValue();
        if (safeValue != null && safeValue.compareTo(new BigDecimal("99999999.99")) > 0) {
            safeValue = new BigDecimal("99999999.99");
        }

        BulkPriceAudit audit = BulkPriceAudit.builder()
                .adminId(admin.getId())
                .adminEmail(admin.getEmail())
                .scope(request.getScope())
                .categoryId(request.getCategoryId())
                .categoryName(categoryName)
                .operation(request.getOperation())
                .type(request.getType())
                .value(safeValue)
                .percentage(BigDecimal.ZERO)
                .productsAffected(affected)
                .timestamp(LocalDateTime.now())
                .status(status)
                .idempotencyKey(request.getIdempotencyKey())
                .build();
        auditRepository.save(audit);
    }
}
