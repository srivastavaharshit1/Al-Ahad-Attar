package com.alahadattars.service.migration;

import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.Promotion;
import com.alahadattars.entity.PromotionConfiguration;
import com.alahadattars.enums.PromotionScope;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.PromotionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BuyProductIdMigrationService {

    private final PromotionRepository promotionRepository;
    private final ProductVariantRepository productVariantRepository;

    public enum MigrationClassification {
        SAFE_TO_CONVERT,
        ALREADY_MIGRATED,
        MANUAL_REVIEW,
        CANNOT_CONVERT
    }

    public record MigrationResult(
            Promotion promotion,
            MigrationClassification classification,
            String reason,
            List<Long> proposedVariantIds
    ) {}

    public record MigrationReport(
            long totalPromotions,
            long legacyPromotions,
            long safe,
            long alreadyMigrated,
            long manualReview,
            long cannotConvert,
            List<MigrationResult> results
    ) {}

    /**
     * Dry run execution. Returns a comprehensive report without writing to the database.
     */
    @Transactional(readOnly = true)
    public MigrationReport dryRun() {
        return executeMigration(true);
    }

    /**
     * Actual execution. Mutates the database.
     * NOTE: Currently we are running in dry-run mode for safety.
     */
    @Transactional
    public MigrationReport execute() {
        return executeMigration(false);
    }

    private MigrationReport executeMigration(boolean dryRun) {
        List<Promotion> allPromotions = promotionRepository.findAll();
        List<MigrationResult> results = new ArrayList<>();

        long totalPromotions = allPromotions.size();
        List<Promotion> legacyPromotions = allPromotions.stream()
                .filter(p -> p.getConfiguration() != null && p.getConfiguration().getBuyProductId() != null)
                .toList();

        long safe = 0;
        long alreadyMigrated = 0;
        long manualReview = 0;
        long cannotConvert = 0;

        for (Promotion promotion : legacyPromotions) {
            MigrationResult result = processPromotion(promotion, dryRun);
            results.add(result);
            switch (result.classification()) {
                case SAFE_TO_CONVERT -> safe++;
                case ALREADY_MIGRATED -> alreadyMigrated++;
                case MANUAL_REVIEW -> manualReview++;
                case CANNOT_CONVERT -> cannotConvert++;
            }
        }

        return new MigrationReport(
                totalPromotions,
                legacyPromotions.size(),
                safe,
                alreadyMigrated,
                manualReview,
                cannotConvert,
                results
        );
    }

    private MigrationResult processPromotion(Promotion promotion, boolean dryRun) {
        PromotionConfiguration config = promotion.getConfiguration();
        Long buyProductId = config.getBuyProductId();

        // 1. Check for missing product or zero variants
        List<ProductVariant> variants = productVariantRepository.findAll().stream()
                .filter(v -> v.getProduct() != null && v.getProduct().getId().equals(buyProductId))
                .toList();

        if (variants.isEmpty()) {
            return new MigrationResult(promotion, MigrationClassification.CANNOT_CONVERT, "Missing product or zero eligible variants", null);
        }

        // 2. Resolve target size restrictions
        List<ProductVariant> eligibleVariants = variants;
        if (config.getBuyVariantSizes() != null && !config.getBuyVariantSizes().isEmpty()) {
            eligibleVariants = variants.stream()
                    .filter(v -> sizeMatches(v.getSize(), config.getBuyVariantSizes(), null))
                    .toList();
        } else if (config.getBuyVariantSize() != null && !config.getBuyVariantSize().isBlank()) {
            eligibleVariants = variants.stream()
                    .filter(v -> sizeMatches(v.getSize(), null, config.getBuyVariantSize()))
                    .toList();
        }

        if (eligibleVariants.isEmpty()) {
            return new MigrationResult(promotion, MigrationClassification.CANNOT_CONVERT, "Size restrictions eliminate all existing variants", null);
        }

        List<Long> targetVariantIds = eligibleVariants.stream().map(ProductVariant::getId).toList();

        // 3. Conflict resolution: Check existing buyVariantIds
        if (config.getBuyVariantIds() != null && !config.getBuyVariantIds().isEmpty()) {
            // Check semantic equivalence
            if (config.getBuyVariantIds().containsAll(targetVariantIds) && targetVariantIds.containsAll(config.getBuyVariantIds())) {
                return new MigrationResult(promotion, MigrationClassification.ALREADY_MIGRATED, "Already migrated and semantically equivalent", targetVariantIds);
            } else {
                return new MigrationResult(promotion, MigrationClassification.MANUAL_REVIEW, "buyProductId exists alongside conflicting buyVariantIds", targetVariantIds);
            }
        }

        // 4. Conflict resolution: Check buyCategoryId
        if (config.getBuyCategoryId() != null) {
            return new MigrationResult(promotion, MigrationClassification.MANUAL_REVIEW, "Both buyProductId and buyCategoryId are present", targetVariantIds);
        }

        // 5. Conflict resolution: Unsupported scope
        if (config.getBuyScope() != null && config.getBuyScope() != PromotionScope.SPECIFIC_PRODUCT) {
            return new MigrationResult(promotion, MigrationClassification.MANUAL_REVIEW, "buyProductId present but scope is not SPECIFIC_PRODUCT", targetVariantIds);
        }

        // 6. Execute safe conversion
        if (!dryRun) {
            config.setBuyVariantIds(new ArrayList<>(targetVariantIds));
            config.setBuyScope(PromotionScope.SPECIFIC_PRODUCT);
            // Intentionally DO NOT remove buyProductId yet
            promotionRepository.save(promotion);
        }

        return new MigrationResult(promotion, MigrationClassification.SAFE_TO_CONVERT, "Deterministically resolved variants", targetVariantIds);
    }

    private boolean sizeMatches(String actualSize, List<String> allowedSizes, String legacySingle) {
        if (actualSize == null) return false;
        List<String> effective;
        if (allowedSizes != null && !allowedSizes.isEmpty()) {
            effective = allowedSizes;
        } else if (legacySingle != null && !legacySingle.isBlank()) {
            effective = List.of(legacySingle);
        } else {
            return true;
        }
        for (String allowed : effective) {
            if (allowed != null && actualSize.trim().equalsIgnoreCase(allowed.trim())) {
                return true;
            }
        }
        return false;
    }
}
