package com.alahadattars.service.impl;

import com.alahadattars.dto.product.BulkPricingApplyResponse;
import com.alahadattars.dto.product.BulkPricingPreviewItem;
import com.alahadattars.dto.product.BulkPricingPreviewResponse;
import com.alahadattars.dto.product.BulkPricingRequest;
import com.alahadattars.entity.BulkPriceAudit;
import com.alahadattars.entity.Category;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.User;
import com.alahadattars.enums.BulkPricingOperation;
import com.alahadattars.enums.BulkPricingScope;
import com.alahadattars.enums.BulkPricingStatus;
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.repository.BulkPriceAuditRepository;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.service.BulkPricingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BulkPricingServiceImpl implements BulkPricingService {

    private final ProductVariantRepository productVariantRepository;
    private final CategoryRepository categoryRepository;
    private final BulkPriceAuditRepository auditRepository;

    @Override
    public BulkPricingPreviewResponse preview(BulkPricingRequest request) {
        validateRequest(request, true);

        String categoryName = null;
        if (request.getScope() == BulkPricingScope.CATEGORY) {
            Category cat = categoryRepository.findById(request.getCategoryId()).orElseThrow();
            categoryName = cat.getName();
        }

        List<ProductVariant> variants = getAffectedVariants(request, categoryName);
        
        BigDecimal currentTotal = BigDecimal.ZERO;
        BigDecimal newTotal = BigDecimal.ZERO;

        List<BulkPricingPreviewItem> examples = new ArrayList<>();
        int sampleCount = 0;

        for (ProductVariant variant : variants) {
            BigDecimal oldPrice = variant.getPrice();
            BigDecimal newPrice = calculateNewPrice(oldPrice, request);

            currentTotal = currentTotal.add(oldPrice);
            newTotal = newTotal.add(newPrice);

            if (sampleCount < 10) {
                examples.add(BulkPricingPreviewItem.builder()
                        .productName(variant.getProduct().getName())
                        .variantSize(variant.getSize())
                        .oldPrice(oldPrice)
                        .newPrice(newPrice)
                        .build());
                sampleCount++;
            }
        }

        return BulkPricingPreviewResponse.builder()
                .productsAffected(variants.size())
                .currentTotalValue(currentTotal)
                .newTotalValue(newTotal)
                .examples(examples)
                .build();
    }

    @Override
    @Transactional
    public BulkPricingApplyResponse apply(BulkPricingRequest request, User admin) {
        validateRequest(request, false);

        String categoryName = null;
        if (request.getScope() == BulkPricingScope.CATEGORY) {
            Category cat = categoryRepository.findById(request.getCategoryId()).orElseThrow();
            categoryName = cat.getName();
        }

        List<ProductVariant> variants = getAffectedVariants(request, categoryName);
        
        if (variants.isEmpty()) {
            throw new BadRequestException("No active products found for the specified scope.");
        }

        List<Long> variantIds = variants.stream().map(ProductVariant::getId).collect(Collectors.toList());

        // Validate that no price drops below zero before executing the bulk update
        for (ProductVariant variant : variants) {
            calculateNewPrice(variant.getPrice(), request); // will throw BadRequestException if <= 0
        }

        try {
            if (request.getOperation() == BulkPricingOperation.SET) {
                productVariantRepository.applySetPrice(variantIds, request.getValue());
            } else if (request.getType() == com.alahadattars.enums.BulkPricingType.PERCENTAGE) {
                BigDecimal factor = request.getValue().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
                if (request.getOperation() == BulkPricingOperation.INCREASE) {
                    productVariantRepository.applyPercentageIncrease(variantIds, factor);
                } else {
                    productVariantRepository.applyPercentageDecrease(variantIds, factor);
                }
            } else {
                if (request.getOperation() == BulkPricingOperation.INCREASE) {
                    productVariantRepository.applyFixedIncrease(variantIds, request.getValue());
                } else {
                    productVariantRepository.applyFixedDecrease(variantIds, request.getValue());
                }
            }

            createAuditRecord(admin, request, categoryName, variants.size(), BulkPricingStatus.SUCCESS);

            return BulkPricingApplyResponse.builder()
                    .success(true)
                    .productsAffected(variants.size())
                    .message("Successfully updated prices for " + variants.size() + " variants.")
                    .build();

        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            log.error("Bulk pricing update failed due to duplicate idempotency key", e);
            throw new BadRequestException("This bulk pricing operation has already been processed.");
        } catch (Exception e) {
            log.error("Bulk pricing update failed", e);
            createAuditRecord(admin, request, categoryName, variants.size(), BulkPricingStatus.FAILED);
            throw new RuntimeException("Failed to apply bulk pricing: " + e.getMessage(), e);
        }
    }

    @Override
    public List<BulkPriceAudit> getHistory() {
        return auditRepository.findAll(Sort.by(Sort.Direction.DESC, "timestamp"));
    }

    private void validateRequest(BulkPricingRequest request, boolean isPreview) {
        if (request.getScope() == BulkPricingScope.CATEGORY && request.getCategoryId() == null) {
            throw new BadRequestException("Category ID must be provided when scope is CATEGORY");
        }
        if (request.getScope() == BulkPricingScope.UNIVERSAL && request.getCategoryId() != null) {
            throw new BadRequestException("Category ID must not be provided when scope is UNIVERSAL");
        }
        if (request.getScope() == BulkPricingScope.CATEGORY) {
            if (!categoryRepository.existsById(request.getCategoryId())) {
                throw new BadRequestException("Invalid category ID");
            }
        }
        if (request.getValue() == null || request.getValue().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Value must be greater than 0");
        }
        if (request.getType() == com.alahadattars.enums.BulkPricingType.PERCENTAGE && request.getOperation() != BulkPricingOperation.SET) {
            if (request.getValue().compareTo(new BigDecimal("99")) > 0) {
                throw new BadRequestException("Percentage cannot exceed 99 to prevent free products or excessive changes");
            }
        }
        if (!isPreview) {
            if (request.getIdempotencyKey() == null || request.getIdempotencyKey().trim().isEmpty()) {
                throw new BadRequestException("Idempotency key is required to prevent double submission");
            }
            if (auditRepository.existsByIdempotencyKey(request.getIdempotencyKey())) {
                throw new BadRequestException("This bulk pricing operation has already been processed.");
            }
        }
    }

    private List<ProductVariant> getAffectedVariants(BulkPricingRequest request, String categoryName) {
        List<ProductVariant> variants;
        if (request.getScope() == BulkPricingScope.UNIVERSAL) {
            variants = productVariantRepository.findAllActiveVariants();
        } else {
            variants = productVariantRepository.findActiveVariantsByCategory(request.getCategoryId());
        }
        
        if (request.getProductTypeFilter() != null) {
            variants = variants.stream()
                .filter(v -> v.getProductType() == request.getProductTypeFilter())
                .collect(Collectors.toList());
        }
        
        if (request.getSize() != null && !request.getSize().trim().isEmpty()) {
            String targetSize = request.getSize().replaceAll("\\s+", "").toLowerCase();
            variants = variants.stream()
                .filter(v -> v.getSize() != null && targetSize.equals(v.getSize().replaceAll("\\s+", "").toLowerCase()))
                .collect(Collectors.toList());
        }
        
        return variants;
    }

    private BigDecimal calculateNewPrice(BigDecimal oldPrice, BulkPricingRequest request) {
        if (request.getOperation() == BulkPricingOperation.SET) {
            return request.getValue().setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal newPrice;

        if (request.getType() == com.alahadattars.enums.BulkPricingType.PERCENTAGE) {
            BigDecimal factor = request.getValue().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
            if (request.getOperation() == BulkPricingOperation.INCREASE) {
                newPrice = oldPrice.multiply(BigDecimal.ONE.add(factor));
            } else {
                newPrice = oldPrice.multiply(BigDecimal.ONE.subtract(factor));
            }
        } else {
            // FIXED Amount
            if (request.getOperation() == BulkPricingOperation.INCREASE) {
                newPrice = oldPrice.add(request.getValue());
            } else {
                newPrice = oldPrice.subtract(request.getValue());
            }
        }

        // Round to 2 decimal places using HALF_UP
        newPrice = newPrice.setScale(2, RoundingMode.HALF_UP);

        if (newPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Price calculation resulted in a zero or negative price, which is not allowed.");
        }

        return newPrice;
    }

    private void createAuditRecord(User admin, BulkPricingRequest request, String categoryName, int affected, BulkPricingStatus status) {
        BulkPriceAudit audit = BulkPriceAudit.builder()
                .adminId(admin.getId())
                .adminEmail(admin.getEmail())
                .scope(request.getScope())
                .categoryId(request.getCategoryId())
                .categoryName(categoryName)
                .operation(request.getOperation())
                .type(request.getType())
                .value(request.getValue())
                .percentage(BigDecimal.ZERO) // Satisfy old DB constraint
                .productsAffected(affected)
                .timestamp(LocalDateTime.now())
                .status(status)
                .idempotencyKey(request.getIdempotencyKey())
                .build();
        auditRepository.save(audit);
    }
}
