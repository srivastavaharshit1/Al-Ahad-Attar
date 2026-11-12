package com.alahadattars.billing.pos;

import com.alahadattars.billing.discount.DiscountCalculation;
import com.alahadattars.billing.discount.DiscountLineBalance;
import com.alahadattars.billing.discount.ManualDiscountApplication;
import com.alahadattars.billing.discount.ManualDiscountCalculator;
import com.alahadattars.billing.discount.ManualDiscountRequest;
import com.alahadattars.billing.security.AuthenticatedBillingAdmin;
import com.alahadattars.dto.cart.CartItemResponse;
import com.alahadattars.dto.cart.CartResponse;
import com.alahadattars.dto.cart.FreeProductOptionResponse;
import com.alahadattars.dto.promotion.PromotionResponse;
import com.alahadattars.entity.Bottle;
import com.alahadattars.entity.Cart;
import com.alahadattars.entity.CartItem;
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
import com.alahadattars.service.PromotionEngineService;
import com.alahadattars.service.PromotionEvaluationContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Resolves trusted catalog data and returns a non-persistent quote; it never claims promotions or changes stock. */
@Service
public class PosQuoteService {
    private static final int MONEY_SCALE = 2;
    private static final BigDecimal ZERO_MONEY = new BigDecimal("0.00");

    private final ProductVariantRepository variantRepository;
    private final BottleRepository bottleRepository;
    private final PromotionEngineService promotionEngineService;
    private final ManualDiscountCalculator manualDiscountCalculator;

    public PosQuoteService(
            ProductVariantRepository variantRepository,
            BottleRepository bottleRepository,
            PromotionEngineService promotionEngineService,
            ManualDiscountCalculator manualDiscountCalculator) {
        this.variantRepository = variantRepository;
        this.bottleRepository = bottleRepository;
        this.promotionEngineService = promotionEngineService;
        this.manualDiscountCalculator = manualDiscountCalculator;
    }

    @Transactional(readOnly = true)
    public PosQuoteResponse quote(PosQuoteRequest request, AuthenticatedBillingAdmin admin) {
        Objects.requireNonNull(request, "quote request is required");
        Objects.requireNonNull(admin, "authenticated Admin is required");
        validateRequestShape(request);

        Set<Long> variantIds = request.lines().stream()
                .map(PosQuoteRequest.Line::variantId)
                .collect(Collectors.toCollection(HashSet::new));
        if (request.freeRewards() != null) {
            request.freeRewards().stream().map(PosQuoteRequest.FreeReward::variantId).forEach(variantIds::add);
        }
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
        List<ResolvedLine> resolvedLines = new ArrayList<>(request.lines().size());

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
            if (variant.getPrice() == null || variant.getPrice().signum() < 0 || variant.getStock() == null) {
                throw new BadRequestException("Selected variant pricing or stock is unavailable.");
            }

            Bottle bottle = line.bottleId() == null ? null : bottles.get(line.bottleId());
            validateBottle(variant, product, bottle);
            if (bottle != null && (bottle.getPrice() == null || bottle.getPrice().signum() < 0
                    || bottle.getStockQuantity() == null)) {
                throw new BadRequestException("Selected bottle pricing or stock is unavailable.");
            }

            variantDemand.merge(variant.getId(), line.quantity(), Math::addExact);
            if (bottle != null) {
                bottleDemand.merge(bottle.getId(), line.quantity(), Math::addExact);
            }
            BigDecimal bottlePrice = bottle == null ? ZERO_MONEY : money(bottle.getPrice());
            BigDecimal unitPrice = money(variant.getPrice().add(bottlePrice));
            resolvedLines.add(new ResolvedLine(line, variant, product, bottle, bottlePrice, unitPrice,
                    money(unitPrice.multiply(BigDecimal.valueOf(line.quantity()))), false, null));
        }

        Cart cart = new Cart();
        cart.setCouponCode(cleanCoupon(request.couponCode()));
        for (ResolvedLine resolved : resolvedLines) {
            cart.addItem(CartItem.builder()
                    .product(resolved.product())
                    .variant(resolved.variant())
                    .bottle(resolved.bottle())
                    .quantity(resolved.request().quantity())
                    .price(resolved.unitPrice())
                    .isGiftSet(false)
                    .freeItem(false)
                    .build());
        }

        // First evaluate paid lines to obtain the POS-filtered free reward choices. The legacy
        // validator is invoked only after this context-aware allow-list check, so its storefront
        // default cannot make a per-customer-limited promotion eligible for POS.
        CartResponse eligibleRewardResult = promotionEngineService.evaluateCart(
                cart, cart.getCouponCode(), PromotionEvaluationContext.POS);
        List<PosQuoteResponse.FreeRewardOption> eligibleRewardOptions = freeOptions(
                eligibleRewardResult == null ? null : eligibleRewardResult.getFreeProductOptions());
        Set<String> selectedRewardKeys = new HashSet<>();
        Set<Long> selectedRewardPromotions = new HashSet<>();
        for (PosQuoteRequest.FreeReward reward : safeFreeRewards(request)) {
            String rewardKey = reward.promotionId() + ":" + reward.variantId();
            if (!selectedRewardKeys.add(rewardKey)) {
                throw new BadRequestException("A free reward may only be selected once.");
            }
            boolean eligible = eligibleRewardOptions.stream().anyMatch(option ->
                    Objects.equals(option.promotionId(), reward.promotionId())
                            && Objects.equals(option.variantId(), reward.variantId()));
            if (!eligible) {
                throw new BadRequestException("The selected free reward is no longer eligible. Refresh the quote.");
            }
            selectedRewardPromotions.add(reward.promotionId());
            if (selectedRewardPromotions.size() > 1) {
                throw new BadRequestException("Free rewards from multiple promotions cannot be combined in one POS sale.");
            }
            ProductVariant variant = variants.get(reward.variantId());
            Product product = variant == null ? null : variant.getProduct();
            if (variant == null || product == null || !product.isActive() || !variant.isActive()
                    || variant.getPrice() == null || variant.getStock() == null) {
                throw new BadRequestException("The selected free reward is unavailable.");
            }
            promotionEngineService.validateFreeItemEligibility(cart, reward.promotionId(), reward.variantId());
            String lineKey = freeRewardLineKey(reward.promotionId(), reward.variantId());
            if (!lineKeys.add(lineKey)) {
                throw new BadRequestException("The selected free reward conflicts with a sale line key.");
            }
            cart.addItem(CartItem.builder()
                    .product(product)
                    .variant(variant)
                    .quantity(1)
                    .price(ZERO_MONEY)
                    .isGiftSet(false)
                    .freeItem(true)
                    .freePromotionId(reward.promotionId())
                    .build());
            variantDemand.merge(variant.getId(), 1, Math::addExact);
            BigDecimal variantPrice = money(variant.getPrice());
            resolvedLines.add(new ResolvedLine(
                    new PosQuoteRequest.Line(lineKey, product.getId(), variant.getId(), null, 1),
                    variant, product, null, ZERO_MONEY, variantPrice, variantPrice, true, reward.promotionId()));
        }

        // Re-evaluate with selected free items included. The POS context still excludes all positive
        // per-customer-limit promotions, and evaluation itself does not claim redemption.
        CartResponse promotionResult = request.freeRewards() == null || request.freeRewards().isEmpty()
                ? eligibleRewardResult
                : promotionEngineService.evaluateCart(cart, cart.getCouponCode(), PromotionEvaluationContext.POS);
        if (promotionResult == null || promotionResult.getTotal() == null
                || promotionResult.getSubtotal() == null || promotionResult.getItems() == null
                || promotionResult.getItems().size() != resolvedLines.size()) {
            throw new IllegalStateException("Promotion evaluator returned an incomplete POS quote.");
        }

        BigDecimal freeRetailSubtotal = resolvedLines.stream().filter(ResolvedLine::freeItem)
                .map(ResolvedLine::lineSubtotal).reduce(ZERO_MONEY, BigDecimal::add);
        BigDecimal subtotal = money(promotionResult.getSubtotal().add(freeRetailSubtotal));
        BigDecimal promotionPayable = money(promotionResult.getTotal());
        if (subtotal.signum() < 0 || promotionPayable.signum() < 0 || promotionPayable.compareTo(subtotal) > 0) {
            throw new IllegalStateException("Promotion evaluator returned inconsistent POS totals.");
        }

        List<BigDecimal> promotionWeights = new ArrayList<>(resolvedLines.size());
        for (int index = 0; index < resolvedLines.size(); index++) {
            CartItemResponse evaluatedLine = promotionResult.getItems().get(index);
            if (!Objects.equals(evaluatedLine.getQuantity(), resolvedLines.get(index).request().quantity())
                    || evaluatedLine.getFinalPrice() == null || evaluatedLine.getFinalPrice().signum() < 0) {
                throw new IllegalStateException("Promotion evaluator returned inconsistent POS line data.");
            }
            promotionWeights.add(money(evaluatedLine.getFinalPrice()
                    .multiply(BigDecimal.valueOf(evaluatedLine.getQuantity()))));
        }

        // The existing evaluator returns exact cart payable totals but only average line prices for
        // partial-quantity rewards. Allocate the exact payable balance by those post-item-promotion
        // weights using largest remainder in cents. This keeps all line balances additive and makes
        // the calculator's item/sale discount caps agree exactly with the evaluator total.
        List<BigDecimal> postPromotionBalances = allocateProportionally(promotionWeights, promotionPayable);
        List<DiscountLineBalance> discountBalances = new ArrayList<>(resolvedLines.size());
        for (int index = 0; index < resolvedLines.size(); index++) {
            discountBalances.add(new DiscountLineBalance(
                    resolvedLines.get(index).request().lineKey(), postPromotionBalances.get(index)));
        }

        Set<String> freeLineKeys = resolvedLines.stream().filter(ResolvedLine::freeItem)
                .map(line -> line.request().lineKey()).collect(Collectors.toSet());
        if (request.manualDiscounts() != null && request.manualDiscounts().stream()
                .anyMatch(discount -> discount.scope() == com.alahadattars.billing.discount.DiscountScope.ITEM
                        && freeLineKeys.contains(discount.lineKey()))) {
            throw new BadRequestException("Manual discounts cannot target a free promotional item.");
        }
        List<ManualDiscountRequest> discountRequests = convertDiscountRequests(request.manualDiscounts());
        DiscountCalculation discountCalculation;
        try {
            discountCalculation = manualDiscountCalculator.calculate(discountBalances, discountRequests);
        } catch (IllegalArgumentException invalidDiscount) {
            throw new BadRequestException("Invalid manual discount: " + invalidDiscount.getMessage());
        }

        BigDecimal payable = money(discountCalculation.finalLineBalances().values().stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add));
        BigDecimal expectedPayable = money(promotionPayable.subtract(discountCalculation.totalManualDiscount()));
        if (payable.signum() < 0 || !payable.equals(expectedPayable)) {
            throw new IllegalStateException("Manual discount result did not reconcile with the quote payable.");
        }

        List<PosQuoteResponse.Line> quoteLines = new ArrayList<>(resolvedLines.size());
        boolean allLinesAvailable = true;
        for (int index = 0; index < resolvedLines.size(); index++) {
            ResolvedLine resolved = resolvedLines.get(index);
            ProductVariant variant = resolved.variant();
            Bottle bottle = resolved.bottle();
            int requestedVariantQuantity = variantDemand.get(variant.getId());
            boolean variantStockSufficient = variant.getStock() >= requestedVariantQuantity;
            Integer requestedBottleQuantity = bottle == null ? null : bottleDemand.get(bottle.getId());
            Integer availableBottleStock = bottle == null ? null : bottle.getStockQuantity();
            boolean bottleStockSufficient = bottle == null || availableBottleStock >= requestedBottleQuantity;
            boolean lineAvailable = variantStockSufficient && bottleStockSufficient;
            allLinesAvailable &= lineAvailable;

            BigDecimal afterPromotions = postPromotionBalances.get(index);
            BigDecimal finalLineTotal = discountCalculation.finalLineBalances()
                    .get(resolved.request().lineKey());
            quoteLines.add(new PosQuoteResponse.Line(
                    resolved.request().lineKey(),
                    resolved.product().getId(),
                    variant.getId(),
                    resolved.product().getName(),
                    variant.getSize(),
                    resolved.request().quantity(),
                    money(variant.getPrice()),
                    bottle != null ? bottle.getId() : null,
                    bottle != null ? bottle.getName() : null,
                    resolved.bottlePrice(),
                    resolved.unitPrice(),
                    resolved.lineSubtotal(),
                    money(resolved.lineSubtotal().subtract(afterPromotions)),
                    afterPromotions,
                    money(afterPromotions.subtract(finalLineTotal)),
                    finalLineTotal,
                    resolved.freeItem(),
                    resolved.freePromotionId(),
                    requestedVariantQuantity,
                    variant.getStock(),
                    variantStockSufficient,
                    requestedBottleQuantity,
                    availableBottleStock,
                    bottleStockSufficient,
                    lineAvailable));
        }

        Instant generatedAt = Instant.now();
        BigDecimal itemPromoDiscount = money(valueOrZero(promotionResult.getItemDiscounts()).add(freeRetailSubtotal));
        BigDecimal cartPromoDiscount = money(valueOrZero(promotionResult.getCartDiscount()));
        BigDecimal totalPromotionDiscount = money(subtotal.subtract(promotionPayable));
        List<ManualDiscountApplication> applications = discountCalculation.applications();

        PosQuoteResponse unkeyed = new PosQuoteResponse(
                generatedAt,
                true,
                admin.userId(),
                admin.email(),
                quoteLines,
                subtotal,
                itemPromoDiscount,
                cartPromoDiscount,
                totalPromotionDiscount,
                money(discountCalculation.totalManualDiscount()),
                payable,
                allLinesAvailable,
                cart.getCouponCode(),
                isCouponApplied(cart.getCouponCode(), promotionResult.getAppliedPromotions()),
                summaries(promotionResult.getAppliedPromotions()),
                summaries(promotionResult.getAvailablePromotions()),
                summaries(promotionResult.getLockedPromotions()),
                eligibleRewardOptions,
                applications.stream().map(application -> new PosQuoteResponse.ManualDiscountPreview(
                        application.scope(), application.type(), application.requestedValue(),
                        application.appliedAmount(), application.calculationBase(),
                        application.lineKey(), application.reason())).toList(),
                promotionResult.getUnlockMessages() == null ? List.of() : promotionResult.getUnlockMessages(),
                "");
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
        }
        if (request.freeRewards() != null && request.freeRewards().size() > 20) {
            throw new BadRequestException("A POS quote may contain at most 20 free rewards.");
        }
        if (request.customerEmail() != null && !request.customerEmail().isBlank()
                && !request.customerEmail().matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new BadRequestException("Customer email is invalid.");
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
        // Match the current CartServiceImpl validation exactly; this quote path does not redefine
        // bottle compatibility or pricing policy.
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
        Category category = product.getCategory();
        boolean bakhoor = category != null && (category.getType() == CategoryType.BAKHOOR
                || "Bakhoor".equalsIgnoreCase(category.getName()));
        ProductType productType = variant.getProductType();
        return !bakhoor && (productType == ProductType.ATTAR || productType == ProductType.PERFUME);
    }

    private static List<ManualDiscountRequest> convertDiscountRequests(
            List<PosQuoteRequest.ManualDiscount> requestedDiscounts) {
        if (requestedDiscounts == null || requestedDiscounts.isEmpty()) return List.of();
        try {
            return requestedDiscounts.stream().map(request -> new ManualDiscountRequest(
                    request.scope(), request.type(), request.value(), request.lineKey(), request.reason())).toList();
        } catch (IllegalArgumentException invalidDiscount) {
            throw new BadRequestException("Invalid manual discount: " + invalidDiscount.getMessage());
        }
    }

    private static List<PosQuoteRequest.FreeReward> safeFreeRewards(PosQuoteRequest request) {
        return request.freeRewards() == null ? List.of() : request.freeRewards();
    }

    private static String freeRewardLineKey(Long promotionId, Long variantId) {
        return "free_" + promotionId + "_" + variantId;
    }

    private static String fingerprint(PosQuoteRequest request, PosQuoteResponse quote) {
        StringBuilder canonical = new StringBuilder();
        append(canonical, quote.adminId());
        append(canonical, cleanCoupon(request.couponCode()));
        append(canonical, request.customerName());
        append(canonical, request.customerMobile());
        append(canonical, request.customerEmail());
        append(canonical, quote.subtotal());
        append(canonical, quote.promotionItemDiscount());
        append(canonical, quote.promotionCartDiscount());
        append(canonical, quote.totalPromotionDiscount());
        append(canonical, quote.manualDiscount());
        append(canonical, quote.payableAmount());
        append(canonical, quote.allLinesAvailable());
        append(canonical, quote.couponApplied());
        quote.lines().stream().sorted(Comparator.comparing(PosQuoteResponse.Line::lineKey)).forEach(line -> {
            append(canonical, line.lineKey());
            append(canonical, line.productId());
            append(canonical, line.variantId());
            append(canonical, line.productName());
            append(canonical, line.variantSize());
            append(canonical, line.quantity());
            append(canonical, line.variantUnitPrice());
            append(canonical, line.bottleId());
            append(canonical, line.bottleName());
            append(canonical, line.bottleUnitPrice());
            append(canonical, line.lineSubtotal());
            append(canonical, line.promotionDiscount());
            append(canonical, line.lineAfterPromotions());
            append(canonical, line.manualDiscount());
            append(canonical, line.finalLineTotal());
            append(canonical, line.requestedVariantQuantity());
            append(canonical, line.variantStockAvailable());
            append(canonical, line.requestedBottleQuantity());
            append(canonical, line.bottleStockAvailable());
            append(canonical, line.available());
            append(canonical, line.freeItem());
            append(canonical, line.freePromotionId());
        });
        quote.appliedPromotions().stream().sorted(Comparator.comparing(PosQuoteResponse.PromotionSummary::id))
                .forEach(promotion -> {
                    append(canonical, promotion.id());
                    append(canonical, promotion.name());
                    append(canonical, promotion.code());
                    append(canonical, promotion.type());
                });
        quote.availablePromotions().stream().sorted(Comparator.comparing(PosQuoteResponse.PromotionSummary::id))
                .forEach(promotion -> {
                    append(canonical, promotion.id());
                    append(canonical, promotion.name());
                    append(canonical, promotion.code());
                    append(canonical, promotion.type());
                });
        quote.lockedPromotions().stream().sorted(Comparator.comparing(PosQuoteResponse.PromotionSummary::id))
                .forEach(promotion -> {
                    append(canonical, promotion.id());
                    append(canonical, promotion.name());
                    append(canonical, promotion.code());
                    append(canonical, promotion.type());
                });
        quote.freeRewardOptions().stream()
                .sorted(Comparator.comparing(PosQuoteResponse.FreeRewardOption::promotionId)
                        .thenComparing(PosQuoteResponse.FreeRewardOption::variantId))
                .forEach(option -> {
                    append(canonical, option.promotionId());
                    append(canonical, option.variantId());
                });
        quote.manualDiscounts().forEach(discount -> {
            append(canonical, discount.scope());
            append(canonical, discount.type());
            append(canonical, discount.requestedValue());
            append(canonical, discount.appliedAmount());
            append(canonical, discount.eligibleBalance());
            append(canonical, discount.lineKey());
            append(canonical, discount.reason());
        });
        try {
            return java.util.HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(canonical.toString().getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is not available", impossible);
        }
    }

    private static void append(StringBuilder target, Object value) {
        if (value == null) {
            target.append("N|");
            return;
        }
        String text = String.valueOf(value);
        target.append('V').append(text.length()).append(':').append(text).append('|');
    }

    private static List<BigDecimal> allocateProportionally(List<BigDecimal> weights, BigDecimal target) {
        BigInteger targetCents = cents(target);
        List<BigInteger> weightCents = weights.stream().map(PosQuoteService::cents).toList();
        BigInteger totalWeight = weightCents.stream().reduce(BigInteger.ZERO, BigInteger::add);
        if (targetCents.signum() < 0 || targetCents.compareTo(totalWeight) > 0) {
            throw new IllegalStateException("Promotion balances cannot be allocated to POS lines.");
        }
        if (targetCents.signum() == 0) {
            return weights.stream().map(ignored -> ZERO_MONEY).toList();
        }
        if (totalWeight.signum() == 0) {
            throw new IllegalStateException("A positive POS payable has no eligible line balance.");
        }

        List<BigInteger> allocations = new ArrayList<>(weights.size());
        List<AllocationRemainder> remainders = new ArrayList<>(weights.size());
        BigInteger allocated = BigInteger.ZERO;
        for (int index = 0; index < weightCents.size(); index++) {
            BigInteger[] division = targetCents.multiply(weightCents.get(index)).divideAndRemainder(totalWeight);
            allocations.add(division[0]);
            allocated = allocated.add(division[0]);
            remainders.add(new AllocationRemainder(index, division[1]));
        }

        int remainingCents = targetCents.subtract(allocated).intValueExact();
        remainders.sort(Comparator.comparing(AllocationRemainder::remainder).reversed()
                .thenComparingInt(AllocationRemainder::index));
        for (int index = 0; index < remainingCents; index++) {
            int lineIndex = remainders.get(index).index();
            allocations.set(lineIndex, allocations.get(lineIndex).add(BigInteger.ONE));
        }
        return allocations.stream().map(value -> new BigDecimal(value, MONEY_SCALE)).toList();
    }

    private static BigInteger cents(BigDecimal value) {
        return money(value).movePointRight(MONEY_SCALE).toBigIntegerExact();
    }

    private static BigDecimal money(BigDecimal value) {
        return value.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }

    private static BigDecimal valueOrZero(BigDecimal value) {
        return value == null ? ZERO_MONEY : value;
    }

    private static String cleanCoupon(String code) {
        return code == null || code.isBlank() ? null : code.trim().toUpperCase(java.util.Locale.ROOT);
    }

    private static boolean isCouponApplied(String couponCode, List<PromotionResponse> applied) {
        if (couponCode == null || applied == null) return false;
        return applied.stream().anyMatch(promotion -> promotion.getCode() != null
                && promotion.getCode().equalsIgnoreCase(couponCode));
    }

    private static List<PosQuoteResponse.PromotionSummary> summaries(List<PromotionResponse> promotions) {
        if (promotions == null) return List.of();
        return promotions.stream().map(promotion -> new PosQuoteResponse.PromotionSummary(
                promotion.getId(), promotion.getName(), promotion.getCode(), promotion.getPromotionType())).toList();
    }

    private static List<PosQuoteResponse.FreeRewardOption> freeOptions(List<FreeProductOptionResponse> options) {
        if (options == null) return List.of();
        return options.stream().map(option -> new PosQuoteResponse.FreeRewardOption(
                option.getPromotionId(), option.getProductId(), option.getVariantId(), option.getProductName(),
                option.getVariant(), option.getPromotion())).toList();
    }

    private record ResolvedLine(
            PosQuoteRequest.Line request,
            ProductVariant variant,
            Product product,
            Bottle bottle,
            BigDecimal bottlePrice,
            BigDecimal unitPrice,
            BigDecimal lineSubtotal,
            boolean freeItem,
            Long freePromotionId) {
    }

    private record AllocationRemainder(int index, BigInteger remainder) {
    }
}
