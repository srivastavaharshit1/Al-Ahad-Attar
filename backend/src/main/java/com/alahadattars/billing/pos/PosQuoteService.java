package com.alahadattars.billing.pos;

import com.alahadattars.billing.discount.DiscountScope;
import com.alahadattars.billing.discount.DiscountType;
import com.alahadattars.billing.security.AuthenticatedBillingAdmin;
import com.alahadattars.entity.Bottle;
import com.alahadattars.entity.Category;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.enums.BottleApplicability;
import com.alahadattars.enums.CategoryType;
import com.alahadattars.enums.ProductType;
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.repository.BottleRepository;
import com.alahadattars.repository.ProductVariantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Independent Shop Counter POS Quote Service.
 * Resolves catalog identity and authoritative inventory availability from the shared catalog,
 * but uses 100% shopkeeper-entered prices and manual discounts.
 * Strictly prohibited from consuming online selling prices, online coupons, or online promotions.
 */
@Service
public class PosQuoteService {
    private static final int MONEY_SCALE = 2;
    private static final BigDecimal ZERO_MONEY = new BigDecimal("0.00");

    private final ProductVariantRepository variantRepository;
    private final BottleRepository bottleRepository;

    public PosQuoteService(
            ProductVariantRepository variantRepository,
            BottleRepository bottleRepository) {
        this.variantRepository = variantRepository;
        this.bottleRepository = bottleRepository;
    }

    @Transactional(readOnly = true)
    public PosQuoteResponse quote(PosQuoteRequest request, AuthenticatedBillingAdmin admin) {
        Objects.requireNonNull(request, "quote request is required");
        Objects.requireNonNull(admin, "authenticated Admin is required");
        validateRequestShape(request);

        Set<Long> variantIds = request.lines().stream()
                .map(PosQuoteRequest.Line::variantId)
                .collect(Collectors.toCollection(HashSet::new));

        Set<Long> bottleIds = request.lines().stream()
                .map(PosQuoteRequest.Line::bottleId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(HashSet::new));

        Map<Long, ProductVariant> variants = variantRepository.findAllByIdWithProductAndCategory(variantIds)
                .stream().collect(Collectors.toMap(ProductVariant::getId, Function.identity()));
        if (variants.size() != variantIds.size()) {
            throw new ResourceNotFoundException("One or more selected variants no longer exist.");
        }

        Map<Long, Bottle> bottles = bottleIds.isEmpty() ? Map.of() : bottleRepository.findAllById(bottleIds)
                .stream().collect(Collectors.toMap(Bottle::getId, Function.identity()));
        if (bottles.size() != bottleIds.size()) {
            throw new ResourceNotFoundException("One or more selected bottles no longer exist.");
        }

        Map<Long, Integer> variantDemand = new HashMap<>();
        Map<Long, Integer> bottleDemand = new HashMap<>();
        Set<String> lineKeys = new HashSet<>();

        // Validate items and consolidate stock demand
        for (PosQuoteRequest.Line line : request.lines()) {
            if (!lineKeys.add(line.lineKey())) {
                throw new BadRequestException("POS quote line keys must be unique.");
            }
            ProductVariant variant = variants.get(line.variantId());
            Product product = variant.getProduct();
            if (product == null || product.getId() == null || !product.getId().equals(line.productId())) {
                throw new BadRequestException("Selected variant does not belong to the selected product.");
            }
            if (!product.isActive() || !variant.isActive()) {
                throw new BadRequestException("Selected product or variant is inactive.");
            }

            Bottle bottle = line.bottleId() == null ? null : bottles.get(line.bottleId());
            validateBottle(variant, product, bottle);

            variantDemand.merge(variant.getId(), line.quantity(), Math::addExact);
            if (bottle != null) {
                bottleDemand.merge(bottle.getId(), line.quantity(), Math::addExact);
            }
        }

        // Calculate independent shop billing amounts
        List<PosQuoteResponse.Line> quoteLines = new ArrayList<>(request.lines().size());
        BigDecimal subtotal = ZERO_MONEY;
        BigDecimal totalLineDiscounts = ZERO_MONEY;

        for (PosQuoteRequest.Line line : request.lines()) {
            ProductVariant variant = variants.get(line.variantId());
            Product product = variant.getProduct();
            Bottle bottle = line.bottleId() == null ? null : bottles.get(line.bottleId());

            // Shopkeeper-entered prices
            BigDecimal productPrice = money(line.productPrice());
            BigDecimal bottleCharge = line.bottleCharge() == null ? ZERO_MONEY : money(line.bottleCharge());
            BigDecimal giftBoxCharge = line.giftBoxCharge() == null ? ZERO_MONEY : money(line.giftBoxCharge());

            // Formula: (Product price × quantity) + Optional bottle charge + Optional gift-box charge
            BigDecimal productTotal = productPrice.multiply(BigDecimal.valueOf(line.quantity())).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
            BigDecimal lineSubtotal = productTotal.add(bottleCharge).add(giftBoxCharge).setScale(MONEY_SCALE, RoundingMode.HALF_UP);

            // Manual line discount entered by shopkeeper
            BigDecimal manualDiscount = line.manualDiscount() == null ? ZERO_MONEY : money(line.manualDiscount());
            BigDecimal finalLineTotal = lineSubtotal.subtract(manualDiscount).max(ZERO_MONEY).setScale(MONEY_SCALE, RoundingMode.HALF_UP);

            subtotal = subtotal.add(lineSubtotal);
            totalLineDiscounts = totalLineDiscounts.add(manualDiscount);

            // Stock check
            int requestedVarQty = variantDemand.get(variant.getId());
            Integer varStock = variant.getStock();
            boolean varSufficient = varStock != null && varStock >= requestedVarQty;

            int requestedBottleQty = bottle == null ? 0 : bottleDemand.getOrDefault(bottle.getId(), 0);
            Integer bStock = bottle == null ? 0 : bottle.getStockQuantity();
            boolean bottleSufficient = bottle == null || (bStock != null && bStock >= requestedBottleQty);

            boolean lineAvailable = varSufficient && bottleSufficient;

            // Unit price for reporting / invoice
            BigDecimal combinedUnitPrice = productPrice.add(line.quantity() > 0 ? bottleCharge.divide(BigDecimal.valueOf(line.quantity()), MONEY_SCALE, RoundingMode.HALF_UP) : ZERO_MONEY);

            quoteLines.add(new PosQuoteResponse.Line(
                    line.lineKey(),
                    product.getId(),
                    variant.getId(),
                    product.getName(),
                    variant.getSize(),
                    line.quantity(),
                    productPrice,
                    bottle == null ? null : bottle.getId(),
                    bottle == null ? null : bottle.getName(),
                    bottleCharge,
                    giftBoxCharge,
                    combinedUnitPrice,
                    lineSubtotal,
                    ZERO_MONEY, // No online promotion discount
                    lineSubtotal, // Post-promotion amount equals subtotal
                    manualDiscount,
                    finalLineTotal,
                    false, // freeItem
                    null, // freePromotionId
                    requestedVarQty,
                    varStock == null ? 0 : varStock,
                    varSufficient,
                    requestedBottleQty,
                    bStock == null ? 0 : bStock,
                    bottleSufficient,
                    lineAvailable
            ));
        }

        // Sale-level manual discounts if provided
        BigDecimal saleDiscounts = ZERO_MONEY;
        List<PosQuoteResponse.ManualDiscountPreview> manualDiscountPreviews = new ArrayList<>();
        if (request.manualDiscounts() != null) {
            for (PosQuoteRequest.ManualDiscount md : request.manualDiscounts()) {
                BigDecimal val = money(md.value());
                saleDiscounts = saleDiscounts.add(val);
                manualDiscountPreviews.add(new PosQuoteResponse.ManualDiscountPreview(
                        md.scope(), md.type(), val, val, subtotal, md.lineKey(), md.reason()
                ));
            }
        }

        BigDecimal totalManualDiscount = totalLineDiscounts.add(saleDiscounts).min(subtotal).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
        BigDecimal payableAmount = subtotal.subtract(totalManualDiscount).max(ZERO_MONEY).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
        boolean allLinesAvailable = quoteLines.stream().allMatch(PosQuoteResponse.Line::available);

        PosQuoteResponse unkeyed = new PosQuoteResponse(
                Instant.now(), true, admin.userId(), admin.email(),
                quoteLines, subtotal, ZERO_MONEY, ZERO_MONEY, ZERO_MONEY, totalManualDiscount,
                payableAmount, allLinesAvailable, null, false, List.of(), List.of(),
                List.of(), List.of(), manualDiscountPreviews, List.of(), "");

        String fingerprint = fingerprint(request, unkeyed);
        return new PosQuoteResponse(
                unkeyed.generatedAt(), unkeyed.previewOnly(), unkeyed.adminId(), unkeyed.adminEmail(),
                unkeyed.lines(), unkeyed.subtotal(), unkeyed.promotionItemDiscount(),
                unkeyed.promotionCartDiscount(), unkeyed.totalPromotionDiscount(), unkeyed.manualDiscount(),
                unkeyed.payableAmount(), unkeyed.allLinesAvailable(), unkeyed.couponCode(),
                unkeyed.couponApplied(), unkeyed.appliedPromotions(), unkeyed.availablePromotions(),
                unkeyed.lockedPromotions(), unkeyed.freeRewardOptions(), unkeyed.manualDiscounts(),
                unkeyed.messages(), fingerprint);
    }

    private static void validateRequestShape(PosQuoteRequest request) {
        if (request.lines() == null || request.lines().isEmpty() || request.lines().size() > 50) {
            throw new BadRequestException("A POS quote must contain between 1 and 50 lines.");
        }
        for (PosQuoteRequest.Line line : request.lines()) {
            if (line == null || line.lineKey() == null || line.productId() == null || line.variantId() == null
                    || line.quantity() == null || line.quantity() < 1 || line.quantity() > 999) {
                throw new BadRequestException("POS quote line data is invalid.");
            }
            if (line.productPrice() == null || line.productPrice().signum() < 0) {
                throw new BadRequestException("Product selling price is required and must be non-negative.");
            }
            if (line.bottleCharge() != null && line.bottleCharge().signum() < 0) {
                throw new BadRequestException("Bottle charge must be non-negative.");
            }
            if (line.giftBoxCharge() != null && line.giftBoxCharge().signum() < 0) {
                throw new BadRequestException("Gift-box charge must be non-negative.");
            }
            if (line.manualDiscount() != null && line.manualDiscount().signum() < 0) {
                throw new BadRequestException("Manual discount must be non-negative.");
            }
        }
    }

    private static void validateBottle(ProductVariant variant, Product product, Bottle bottle) {
        if (bottle == null) {
            if (requiresBottle(variant, product)) {
                throw new BadRequestException("A bottle must be selected for this fragrance.");
            }
            return;
        }
        if (!bottle.isActive()) {
            throw new BadRequestException("Selected bottle is inactive.");
        }
        BottleApplicability applicability = bottle.getApplicability();
        if (applicability == null) {
            throw new BadRequestException("Selected bottle applicability is unavailable.");
        }
        if (applicability != BottleApplicability.BOTH) {
            if (variant.getProductType() == ProductType.ATTAR && applicability != BottleApplicability.ATTAR) {
                throw new BadRequestException("This bottle is not applicable for Attars.");
            }
            if (variant.getProductType() == ProductType.PERFUME && applicability != BottleApplicability.PERFUME) {
                throw new BadRequestException("This bottle is not applicable for Perfumes.");
            }
        }
    }

    private static boolean requiresBottle(ProductVariant variant, Product product) {
        if (variant == null || product == null || isBakhoor(product)) {
            return false;
        }
        ProductType type = variant.getProductType();
        return type == ProductType.ATTAR || type == ProductType.PERFUME;
    }

    private static boolean isBakhoor(Product product) {
        if (product == null) return false;
        Category category = product.getCategory();
        if (category == null) return false;
        if (category.getType() == CategoryType.BAKHOOR) return true;
        String name = category.getName();
        return name != null && name.trim().equalsIgnoreCase("Bakhoor");
    }

    private static String fingerprint(PosQuoteRequest request, PosQuoteResponse quote) {
        StringBuilder canonical = new StringBuilder();
        append(canonical, quote.adminId());
        append(canonical, clean(request.customerName()));
        append(canonical, clean(request.customerMobile()));
        append(canonical, clean(request.customerEmail()));
        append(canonical, quote.subtotal());
        append(canonical, quote.manualDiscount());
        append(canonical, quote.payableAmount());
        append(canonical, quote.allLinesAvailable());

        quote.lines().stream().sorted(Comparator.comparing(PosQuoteResponse.Line::lineKey)).forEach(line -> {
            append(canonical, line.lineKey());
            append(canonical, line.productId());
            append(canonical, line.variantId());
            append(canonical, line.bottleId());
            append(canonical, line.quantity());
            append(canonical, line.variantUnitPrice());
            append(canonical, line.bottleUnitPrice());
            append(canonical, line.giftBoxCharge());
            append(canonical, line.manualDiscount());
            append(canonical, line.finalLineTotal());
        });

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(canonical.toString().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }

    private static void append(StringBuilder sb, Object val) {
        sb.append(val == null ? "null" : val.toString().trim()).append("|");
    }

    private static String clean(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static BigDecimal money(BigDecimal amount) {
        return amount.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }
}
