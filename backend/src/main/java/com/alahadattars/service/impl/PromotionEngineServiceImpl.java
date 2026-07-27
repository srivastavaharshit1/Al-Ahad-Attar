package com.alahadattars.service.impl;

import com.alahadattars.dto.cart.CartItemResponse;
import com.alahadattars.dto.cart.CartResponse;
import com.alahadattars.dto.cart.FreeProductOptionResponse;
import com.alahadattars.dto.promotion.PromotionResponse;
import com.alahadattars.entity.Cart;
import com.alahadattars.entity.CartItem;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.Promotion;
import com.alahadattars.entity.PromotionConfiguration;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.enums.DiscountType;
import com.alahadattars.enums.PromotionType;
import com.alahadattars.repository.OrderRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.PromotionRepository;
import com.alahadattars.service.PromotionEngineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.HashSet;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PromotionEngineServiceImpl implements PromotionEngineService {

    private final PromotionRepository promotionRepository;
    private final OrderRepository orderRepository;
    private final ProductVariantRepository productVariantRepository;

    // ─── evaluateCart ─────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public CartResponse evaluateCart(Cart cart, String couponCode) {
        LocalDateTime now = LocalDateTime.now();
        List<Promotion> automaticPromotions = promotionRepository.findActiveAutomaticPromotions(now);
        List<Promotion> allPromotions = new ArrayList<>();

        Long manualPromoId = cart.getManuallySelectedPromotionId();
        Promotion manualPromo = null;
        if (manualPromoId != null) {
            if (manualPromoId.equals(-1L)) {
                for (Promotion p : automaticPromotions) {
                    if (p.isStackable()) allPromotions.add(p);
                }
            } else {
                manualPromo = promotionRepository.findById(manualPromoId).orElse(null);
                if (manualPromo != null && isPromotionValid(manualPromo)) {
                    allPromotions.add(manualPromo);
                    for (Promotion p : automaticPromotions) {
                        if (p.isStackable() && !p.getId().equals(manualPromoId)) allPromotions.add(p);
                    }
                } else {
                    for (Promotion p : automaticPromotions) {
                        if (p.isStackable()) allPromotions.add(p);
                    }
                    manualPromo = null;
                }
            }
        } else {
            allPromotions.addAll(automaticPromotions);
        }

        String cleanCoupon = (couponCode != null && !couponCode.trim().isEmpty())
                ? couponCode.trim().toUpperCase() : null;
        boolean couponFound = false;
        boolean couponApplied = false;

        if (cleanCoupon != null) {
            Optional<Promotion> couponOpt = promotionRepository.findActivePromotionByCode(cleanCoupon, now);
            if (couponOpt.isPresent()) {
                Promotion coupon = couponOpt.get();
                if (isPromotionValid(coupon)) {
                    allPromotions.add(coupon);
                    couponFound = true;
                }
            } else {
                log.warn("Coupon code not found or inactive: {}", cleanCoupon);
            }
        }

        allPromotions.sort((a, b) -> Integer.compare(b.getPriority(), a.getPriority()));

        boolean userHasPreviousOrders = false;
        if (cart.getUser() != null) {
            long orderCount = orderRepository.countByUserEmail(cart.getUser().getEmail());
            userHasPreviousOrders = (orderCount > 0);
        }

        List<CartItemResponse> itemResponses = new ArrayList<>();
        BigDecimal originalSubtotal = BigDecimal.ZERO;

        for (CartItem item : cart.getItems()) {
            // Free items don't add to the subtotal
            if (!item.isFreeItem()) {
                originalSubtotal = originalSubtotal.add(
                        item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
            }
            CartItemResponse response = CartItemResponse.builder()
                    .id(item.getId())
                    .productId(item.getProduct().getId())
                    .variantId(item.getVariant().getId())
                    .name(item.getProduct().getName())
                    .image(item.getVariant().getImage())
                    .size(item.getVariant().getSize())
                    .quantity(item.getQuantity())
                    .originalPrice(item.isFreeItem() ? BigDecimal.ZERO : item.getPrice())
                    .discountAmount(BigDecimal.ZERO)
                    .finalPrice(item.isFreeItem() ? BigDecimal.ZERO : item.getPrice())
                    .appliedPromotions(new ArrayList<>())
                    .freeItem(item.isFreeItem())
                    .freePromotionId(item.getFreePromotionId())
                    .build();
            itemResponses.add(response);
        }

        BigDecimal totalItemDiscounts = BigDecimal.ZERO;
        boolean hasAppliedNonStackable = false;
        Set<Promotion> appliedPromos = new HashSet<>();
        Set<Promotion> lockedPromos = new HashSet<>();
        Set<Promotion> availablePromos = new HashSet<>();
        List<String> unlockMessages = new ArrayList<>();
        BigDecimal cartDiscountAmount = BigDecimal.ZERO;

        // Phase 1: PRODUCT_DISCOUNT and CATEGORY_DISCOUNT
        for (Promotion promo : allPromotions) {
            if (promo.getPromotionType() == PromotionType.FREE_PRODUCT) continue; // handled in Phase 4
            if (hasAppliedNonStackable && !promo.isStackable()) continue;

            if (promo.getPromotionType() == PromotionType.PRODUCT_DISCOUNT
                    || promo.getPromotionType() == PromotionType.CATEGORY_DISCOUNT) {
                boolean promoAppliedToAnyItem = false;
                for (CartItemResponse itemResponse : itemResponses) {
                    if (itemResponse.isFreeItem()) continue; // never discount free items
                    CartItem cartItem = findCartItem(cart, itemResponse.getId());
                    if (isItemEligible(promo, cartItem)) {
                        BigDecimal itemDiscount = calculateItemDiscount(promo, itemResponse.getOriginalPrice())
                                .min(itemResponse.getOriginalPrice());
                        if (itemDiscount.compareTo(BigDecimal.ZERO) > 0) {
                            itemResponse.setDiscountAmount(itemResponse.getDiscountAmount().add(itemDiscount));
                            itemResponse.setFinalPrice(itemResponse.getOriginalPrice()
                                    .subtract(itemResponse.getDiscountAmount()).max(BigDecimal.ZERO));
                            totalItemDiscounts = totalItemDiscounts.add(
                                    itemDiscount.multiply(BigDecimal.valueOf(itemResponse.getQuantity())));
                            promoAppliedToAnyItem = true;
                            if (cleanCoupon != null && cleanCoupon.equalsIgnoreCase(promo.getCode()))
                                couponApplied = true;
                        }
                    }
                }
                if (promoAppliedToAnyItem) {
                    appliedPromos.add(promo);
                    if (!promo.isStackable()) hasAppliedNonStackable = true;
                }
            }
        }



        BigDecimal subtotalAfterItemDiscounts = originalSubtotal.subtract(totalItemDiscounts).max(BigDecimal.ZERO);

        // Phase 3: CART_DISCOUNT, FREE_SHIPPING, FIRST_ORDER
        for (Promotion promo : allPromotions) {
            if (promo.getPromotionType() == PromotionType.FREE_PRODUCT) continue;
            if (hasAppliedNonStackable && !promo.isStackable()) continue;

            boolean isCartDiscount = promo.getPromotionType() == PromotionType.CART_DISCOUNT;
            boolean isFreeShipping = promo.getPromotionType() == PromotionType.FREE_SHIPPING;
            boolean isFirstOrder = promo.getPromotionType() == PromotionType.FIRST_ORDER;

            if (!isCartDiscount && !isFreeShipping && !isFirstOrder) continue;

            if (isFirstOrder && userHasPreviousOrders) {
                log.info("[FIRST_ORDER] Skipping promo '{}' – user has previous orders", promo.getName());
                continue;
            }
            PromotionConfiguration config = promo.getConfiguration();
            if (config != null && config.isFirstOrderOnly() && userHasPreviousOrders) {
                log.info("[FIRST_ORDER_FLAG] Skipping promo '{}' – firstOrderOnly=true", promo.getName());
                continue;
            }
            if (promo.getMinCartValue() != null
                    && subtotalAfterItemDiscounts.compareTo(promo.getMinCartValue()) < 0) {
                BigDecimal diff = promo.getMinCartValue().subtract(subtotalAfterItemDiscounts);
                if (diff.compareTo(new BigDecimal("500")) <= 0) {
                    unlockMessages.add("Spend ₹" + diff.setScale(0, RoundingMode.HALF_UP)
                            + " more to unlock " + promo.getName());
                    lockedPromos.add(promo);
                }
                continue;
            }
            BigDecimal discount = calculateCartDiscount(promo, subtotalAfterItemDiscounts);
            if (discount.compareTo(BigDecimal.ZERO) > 0 || isFreeShipping) {
                if (!isFreeShipping) cartDiscountAmount = cartDiscountAmount.add(discount);
                appliedPromos.add(promo);
                if (!promo.isStackable()) hasAppliedNonStackable = true;
                if (cleanCoupon != null && cleanCoupon.equalsIgnoreCase(promo.getCode())) couponApplied = true;
            }
        }

        BigDecimal finalTotal = subtotalAfterItemDiscounts.subtract(cartDiscountAmount).max(BigDecimal.ZERO);

        if (cleanCoupon != null && !couponFound) {
            unlockMessages.add("Coupon code '" + cleanCoupon + "' is invalid or expired.");
        } else if (cleanCoupon != null && couponFound && !couponApplied) {
            unlockMessages.add("Coupon '" + cleanCoupon
                    + "' is valid but conditions not met (check minimum cart value or eligible products).");
        }

        // Phase 4: FREE_PRODUCT — evaluate eligibility and populate freeProductOptions
        List<FreeProductOptionResponse> freeProductOptions = evaluateFreeProductOptions(cart, couponCode);

        // Revalidate existing free items in the cart
        for (CartItem item : cart.getItems()) {
            if (!item.isFreeItem()) continue;
            boolean stillValid = validateFreeItemStillValid(cart, item, couponCode);
            if (!stillValid) {
                // Mark invalid — CartServiceImpl handles actual removal; we just warn
                unlockMessages.add("Your free gift '"
                        + item.getProduct().getName() + " (" + item.getVariant().getSize()
                        + ")' may no longer be valid. Please remove and re-add.");
                log.warn("[FREE_PRODUCT] Free item cartItemId={} may be invalid — promo no longer qualifies",
                        item.getId());
            }
        }

        // Populate available/locked lists (exclude FREE_PRODUCT — handled separately)
        for (Promotion p : automaticPromotions) {
            if (p.getPromotionType() == PromotionType.FREE_PRODUCT) continue;
            if (!appliedPromos.contains(p) && !lockedPromos.contains(p)) availablePromos.add(p);
        }
        if (manualPromo != null && !appliedPromos.contains(manualPromo) && !lockedPromos.contains(manualPromo)) {
            availablePromos.add(manualPromo);
        }
        if (couponFound && cleanCoupon != null) {
            Optional<Promotion> couponOpt = promotionRepository.findActivePromotionByCode(cleanCoupon, now);
            if (couponOpt.isPresent()) {
                Promotion cp = couponOpt.get();
                if (cp.getPromotionType() != PromotionType.FREE_PRODUCT
                        && !appliedPromos.contains(cp) && !lockedPromos.contains(cp)) {
                    availablePromos.add(cp);
                }
            }
        }

        List<PromotionResponse> appliedDto = appliedPromos.stream()
                .map(PromotionResponse::fromEntity).collect(Collectors.toList());
        List<PromotionResponse> lockedDto = lockedPromos.stream()
                .map(PromotionResponse::fromEntity).collect(Collectors.toList());
        List<PromotionResponse> availableDto = availablePromos.stream()
                .map(PromotionResponse::fromEntity).collect(Collectors.toList());

        return CartResponse.builder()
                .id(cart.getId())
                .items(itemResponses)
                .subtotal(originalSubtotal)
                .itemDiscounts(totalItemDiscounts)
                .cartDiscount(cartDiscountAmount)
                .total(finalTotal)
                .couponCode(cart.getCouponCode())
                .appliedPromotions(appliedDto)
                .availablePromotions(availableDto)
                .lockedPromotions(lockedDto)
                .unlockMessages(unlockMessages)
                .manuallySelectedPromotionId(cart.getManuallySelectedPromotionId())
                .freeProductOptions(freeProductOptions)
                .build();
    }

    // ─── evaluateFreeProductOptions ───────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<FreeProductOptionResponse> evaluateFreeProductOptions(Cart cart, String couponCode) {
        if (cart == null || cart.getItems() == null || cart.getItems().isEmpty()) return List.of();

        LocalDateTime now = LocalDateTime.now();
        List<Promotion> allActive = promotionRepository.findAllActivePromotions(now);

        // Add coupon-based FREE_PRODUCT promotion if applicable
        String cleanCoupon = (couponCode != null && !couponCode.trim().isEmpty())
                ? couponCode.trim().toUpperCase() : null;
        if (cleanCoupon != null) {
            promotionRepository.findActivePromotionByCode(cleanCoupon, now)
                    .filter(p -> p.getPromotionType() == PromotionType.FREE_PRODUCT)
                    .filter(this::isPromotionValid)
                    .ifPresent(p -> { if (!allActive.contains(p)) allActive.add(p); });
        }

        List<FreeProductOptionResponse> options = new ArrayList<>();

        for (Promotion promo : allActive) {
            if (promo.getPromotionType() != PromotionType.FREE_PRODUCT) continue;
            if (!isPromotionValid(promo)) continue;

            PromotionConfiguration config = promo.getConfiguration();
            if (config == null) continue;

            // Check cart qualification
            if (!cartQualifiesForFreeProduct(cart, promo, config)) continue;

            // How many free items from this promo already in cart?
            long alreadyAdded = cart.getItems().stream()
                    .filter(item -> item.isFreeItem() && promo.getId().equals(item.getFreePromotionId()))
                    .mapToLong(CartItem::getQuantity).sum();

            int maxFree = config.getMaxFreeQuantity() != null ? config.getMaxFreeQuantity() : 1;
            if (alreadyAdded >= maxFree) {
                log.debug("[FREE_PRODUCT] Promo '{}' already fulfilled (added={})", promo.getName(), alreadyAdded);
                continue;
            }

            List<ProductVariant> eligible;
            if (config.getFreeVariantIds() != null && !config.getFreeVariantIds().isEmpty()) {
                eligible = productVariantRepository.findEligibleFreeVariantsByIds(config.getFreeVariantIds());
            } else {
                // Fallback to legacy string matching if Variant IDs are not configured
                List<Long> freeCatIds = resolveFreeCategories(config);
                if (freeCatIds.isEmpty()) continue;

                String freeSize = config.getAllowedFreeVariantSize();
                if (freeSize == null || freeSize.isBlank()) {
                    log.warn("[FREE_PRODUCT] Promo '{}' has no allowedFreeVariantSize or freeVariantIds configured", promo.getName());
                    continue;
                }

                eligible = productVariantRepository.findEligibleFreeVariants(freeCatIds, freeSize);

                if (config.getFreeProductIds() != null && !config.getFreeProductIds().isEmpty()) {
                    eligible = eligible.stream()
                            .filter(v -> config.getFreeProductIds().contains(v.getProduct().getId()))
                            .collect(Collectors.toList());
                }
            }

            for (ProductVariant v : eligible) {
                options.add(FreeProductOptionResponse.builder()
                        .promotionId(promo.getId())
                        .productId(v.getProduct().getId())
                        .variantId(v.getId())
                        .productName(v.getProduct().getName())
                        .variant(v.getSize())
                        .price(BigDecimal.ZERO)
                        .promotion(promo.getName())
                        .image(v.getImage())
                        .categoryName(v.getProduct().getCategory() != null
                                ? v.getProduct().getCategory().getName() : "")
                        .build());
            }

            // Highest-priority qualifying FREE_PRODUCT promo wins (no stacking)
            if (!options.isEmpty()) {
                log.info("[FREE_PRODUCT] Promo '{}' matched — {} options available", promo.getName(), options.size());
                break;
            }
        }

        return options;
    }

    // ─── validateFreeItemEligibility ─────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public void validateFreeItemEligibility(Cart cart, Long promotionId, Long variantId) {
        LocalDateTime now = LocalDateTime.now();

        Promotion promo = promotionRepository.findById(promotionId)
                .orElseThrow(() -> new com.alahadattars.exception.ResourceNotFoundException(
                        "Promotion not found: " + promotionId));

        if (promo.getPromotionType() != PromotionType.FREE_PRODUCT)
            throw new IllegalArgumentException("Promotion " + promotionId + " is not a FREE_PRODUCT type.");
        if (!promo.isActive())
            throw new IllegalArgumentException("This free product promotion is currently disabled.");
        if (!isDateValid(promo, now))
            throw new IllegalArgumentException("This free product promotion has expired or not yet started.");
        if (!isPromotionValid(promo))
            throw new IllegalArgumentException("This free product promotion is no longer valid.");

        PromotionConfiguration config = promo.getConfiguration();
        if (config == null)
            throw new IllegalArgumentException("Promotion configuration is missing.");

        // Cart must still qualify
        if (!cartQualifiesForFreeProduct(cart, promo, config))
            throw new IllegalArgumentException(
                    "Your cart no longer qualifies for this free product promotion. "
                    + "Please ensure you have the required item and quantity.");

        // Check max free quantity
        long alreadyAdded = cart.getItems().stream()
                .filter(item -> item.isFreeItem() && promo.getId().equals(item.getFreePromotionId()))
                .mapToLong(CartItem::getQuantity).sum();
        int maxFree = config.getMaxFreeQuantity() != null ? config.getMaxFreeQuantity() : 1;
        if (alreadyAdded >= maxFree)
            throw new IllegalArgumentException(
                    "You have already added the maximum number of free items for this promotion.");

        // Check duplicate
        boolean duplicate = cart.getItems().stream()
                .anyMatch(item -> item.isFreeItem()
                        && promo.getId().equals(item.getFreePromotionId())
                        && item.getVariant().getId().equals(variantId));
        if (duplicate)
            throw new IllegalArgumentException("This free item is already in your cart.");

        // Validate the chosen variant is eligible
        ProductVariant chosen = productVariantRepository.findById(variantId)
                .orElseThrow(() -> new com.alahadattars.exception.ResourceNotFoundException(
                        "Variant not found: " + variantId));

        if (!chosen.isActive() || chosen.getStock() <= 0)
            throw new IllegalArgumentException(
                    "The selected free item is out of stock or unavailable.");

        // CRITICAL: Variant size must exactly match allowedFreeVariantSize OR Variant ID must match
        if (config.getFreeVariantIds() != null && !config.getFreeVariantIds().isEmpty()) {
            if (!config.getFreeVariantIds().contains(variantId)) {
                throw new IllegalArgumentException(
                        "The selected variant is not eligible for this promotion.");
            }
        } else {
            String allowed = config.getAllowedFreeVariantSize();
            if (allowed == null || !allowed.trim().equalsIgnoreCase(chosen.getSize()))
                throw new IllegalArgumentException(
                        "The selected variant '" + chosen.getSize()
                        + "' is not eligible. Only '" + allowed + "' is allowed as a free item for this promotion.");
        }

        // Category must be in freeCategoryIds
        List<Long> freeCatIds = resolveFreeCategories(config);
        Long chosenCatId = chosen.getProduct().getCategory() != null
                ? chosen.getProduct().getCategory().getId() : null;
        if (chosenCatId == null || !freeCatIds.contains(chosenCatId))
            throw new IllegalArgumentException(
                    "The selected product is not from an eligible category for this promotion.");

        // Optional: specific product restriction
        if (config.getFreeProductIds() != null && !config.getFreeProductIds().isEmpty()) {
            if (!config.getFreeProductIds().contains(chosen.getProduct().getId()))
                throw new IllegalArgumentException(
                        "The selected product is not eligible for this promotion.");
        }

        log.info("[FREE_PRODUCT] Validation passed: promotionId={}, variantId={}", promotionId, variantId);
    }

    // ─── calculateBestProductPrice ────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public BigDecimal calculateBestProductPrice(Product product, BigDecimal originalPrice) {
        LocalDateTime now = LocalDateTime.now();
        List<Promotion> automaticPromotions = promotionRepository.findActiveAutomaticPromotions(now);
        BigDecimal bestPrice = originalPrice;
        for (Promotion promo : automaticPromotions) {
            if (promo.getPromotionType() == PromotionType.FREE_PRODUCT) continue;
            if (promo.getPromotionType() == PromotionType.PRODUCT_DISCOUNT
                    || promo.getPromotionType() == PromotionType.CATEGORY_DISCOUNT) {
                if (isProductEligible(promo, product)) {
                    BigDecimal discountedPrice = originalPrice.subtract(
                            calculateItemDiscount(promo, originalPrice));
                    if (discountedPrice.compareTo(bestPrice) < 0) bestPrice = discountedPrice;
                }
            }
        }
        return bestPrice;
    }

    // ─── FREE_PRODUCT Qualification Logic ────────────────────────────────────

    /**
     * Returns true if the cart contains enough qualifying items to trigger this FREE_PRODUCT promo.
     */
    private boolean cartQualifiesForFreeProduct(Cart cart, Promotion promo, PromotionConfiguration config) {
        // Minimum cart value check
        if (promo.getMinCartValue() != null) {
            BigDecimal cartTotal = cart.getItems().stream()
                    .filter(i -> !i.isFreeItem())
                    .map(i -> i.getPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (cartTotal.compareTo(promo.getMinCartValue()) < 0) return false;
        }

        // Variant qualification
        if (config.getBuyVariantIds() == null || config.getBuyVariantIds().isEmpty()) {
            String buySize = config.getBuyVariantSize();
            if (buySize == null || buySize.isBlank()) {
                // No variant size or ID restriction — any qualifying item works
            }
        }

        int minQty = config.getMinPurchaseQuantity() != null ? config.getMinPurchaseQuantity() : 1;

        long qualifyingQty = cart.getItems().stream()
                .filter(item -> !item.isFreeItem())
                .filter(item -> itemMatchesBuyCondition(item, config))
                .mapToLong(CartItem::getQuantity)
                .sum();

        return qualifyingQty >= minQty;
    }

    /**
     * Returns true if the cart item satisfies the buy-side conditions.
     */
    private boolean itemMatchesBuyCondition(CartItem item, PromotionConfiguration config) {
        // Category filter
        if (config.getBuyCategoryId() != null) {
            if (item.getProduct().getCategory() == null) return false;
            if (!item.getProduct().getCategory().getId().equals(config.getBuyCategoryId())) return false;
        }

        // Product filter
        if (config.getBuyProductId() != null) {
            if (!item.getProduct().getId().equals(config.getBuyProductId())) return false;
        }

        // Variant ID filter
        if (config.getBuyVariantIds() != null && !config.getBuyVariantIds().isEmpty()) {
            if (!config.getBuyVariantIds().contains(item.getVariant().getId())) return false;
        } else {
            // Variant size filter — CASE INSENSITIVE
            String buySize = config.getBuyVariantSize();
            if (buySize != null && !buySize.isBlank()) {
                String itemSize = item.getVariant().getSize();
                return itemSize != null && itemSize.trim().equalsIgnoreCase(buySize.trim());
            }
        }

        return true;
    }

    /**
     * Resolve free category IDs — falls back to buyCategoryId if no freeCategoryIds set.
     */
    private List<Long> resolveFreeCategories(PromotionConfiguration config) {
        if (config.getFreeCategoryIds() != null && !config.getFreeCategoryIds().isEmpty()) {
            return config.getFreeCategoryIds();
        }
        if (config.getBuyCategoryId() != null) {
            return List.of(config.getBuyCategoryId());
        }
        return List.of();
    }

    /**
     * Check if an existing free item in the cart is still valid (used during cart evaluation).
     */
    private boolean validateFreeItemStillValid(Cart cart, CartItem freeItem, String couponCode) {
        if (freeItem.getFreePromotionId() == null) return false;
        LocalDateTime now = LocalDateTime.now();
        Optional<Promotion> promoOpt = promotionRepository.findById(freeItem.getFreePromotionId());
        if (promoOpt.isEmpty()) return false;
        Promotion promo = promoOpt.get();
        if (!promo.isActive() || !isDateValid(promo, now) || !isPromotionValid(promo)) return false;
        PromotionConfiguration config = promo.getConfiguration();
        if (config == null) return false;
        if (!cartQualifiesForFreeProduct(cart, promo, config)) return false;
        // Check variant still matches
        String allowed = config.getAllowedFreeVariantSize();
        if (allowed == null || !allowed.trim().equalsIgnoreCase(freeItem.getVariant().getSize())) return false;
        // Check stock
        return freeItem.getVariant().getStock() > 0;
    }

    // ─── Existing Helpers (unchanged) ────────────────────────────────────────

    private boolean isPromotionValid(Promotion promotion) {
        if (!promotion.isActive()) return false;
        if (promotion.getUsageLimit() != null && promotion.getUsedCount() >= promotion.getUsageLimit())
            return false;
        return true;
    }

    private boolean isDateValid(Promotion promo, LocalDateTime now) {
        if (promo.getStartDate() != null && now.isBefore(promo.getStartDate())) return false;
        if (promo.getEndDate() != null && now.isAfter(promo.getEndDate())) return false;
        return true;
    }

    private CartItem findCartItem(Cart cart, Long itemId) {
        return cart.getItems().stream().filter(i -> i.getId().equals(itemId)).findFirst().orElse(null);
    }

    private boolean isItemEligible(Promotion promo, CartItem cartItem) {
        if (cartItem == null) return false;
        return isProductEligible(promo, cartItem.getProduct());
    }

    private boolean isProductEligible(Promotion promo, Product product) {
        if (product == null) return false;
        PromotionConfiguration config = promo.getConfiguration();
        if (promo.getPromotionType() == PromotionType.CATEGORY_DISCOUNT) {
            if (config == null || config.getApplicableCategoryIds() == null
                    || config.getApplicableCategoryIds().isEmpty()) return true;
            if (product.getCategory() == null) return false;
            return config.getApplicableCategoryIds().contains(product.getCategory().getId());
        }
        if (promo.getPromotionType() == PromotionType.PRODUCT_DISCOUNT) {
            if (config == null || config.getApplicableProductIds() == null
                    || config.getApplicableProductIds().isEmpty()) return true;
            return config.getApplicableProductIds().contains(product.getId());
        }
        return false;
    }

    private BigDecimal calculateItemDiscount(Promotion promo, BigDecimal originalPrice) {
        if (promo.getDiscountType() == DiscountType.PERCENTAGE) {
            BigDecimal discount = originalPrice.multiply(promo.getDiscountValue())
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            if (promo.getMaxDiscountValue() != null && promo.getMaxDiscountValue().compareTo(BigDecimal.ZERO) > 0
                    && discount.compareTo(promo.getMaxDiscountValue()) > 0)
                return promo.getMaxDiscountValue();
            return discount;
        } else if (promo.getDiscountType() == DiscountType.FIXED_AMOUNT) {
            return promo.getDiscountValue().min(originalPrice);
        } else if (promo.getDiscountType() == DiscountType.FREE_ITEM) {
            return originalPrice;
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal calculateCartDiscount(Promotion promo, BigDecimal cartTotal) {
        if (promo.getDiscountType() == DiscountType.PERCENTAGE) {
            BigDecimal discount = cartTotal.multiply(promo.getDiscountValue())
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            if (promo.getMaxDiscountValue() != null && promo.getMaxDiscountValue().compareTo(BigDecimal.ZERO) > 0
                    && discount.compareTo(promo.getMaxDiscountValue()) > 0)
                return promo.getMaxDiscountValue();
            return discount;
        } else if (promo.getDiscountType() == DiscountType.FIXED_AMOUNT) {
            return promo.getDiscountValue().min(cartTotal);
        }
        return BigDecimal.ZERO;
    }
}
