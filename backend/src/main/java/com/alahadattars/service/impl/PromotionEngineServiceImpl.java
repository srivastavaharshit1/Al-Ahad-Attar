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
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.repository.OrderRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.PromotionRedemptionRepository;
import com.alahadattars.repository.PromotionRepository;
import com.alahadattars.service.PromotionEngineService;
import com.alahadattars.service.ProductImageResolver;
import com.alahadattars.service.StorageService;
import com.alahadattars.service.promotion.EligibilityConditionFactory;
import com.alahadattars.service.promotion.ItemEligibilityCondition;
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
    private final PromotionRedemptionRepository promotionRedemptionRepository;
    private final StorageService storageService;
    private final ProductImageResolver productImageResolver;
    private final PromotionResponseMapper promotionResponseMapper;
    private final EligibilityConditionFactory eligibilityConditionFactory;

    // ─── evaluateCart ─────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public CartResponse evaluateCart(Cart cart, String couponCode) {
        LocalDateTime now = LocalDateTime.now();
        // The query enforces the date window, but not the usage/per-user limits — apply those here so an
        // exhausted promotion is neither applied nor advertised as available.
        List<Promotion> automaticPromotions = new ArrayList<>(promotionRepository.findActiveAutomaticPromotions(now));
        automaticPromotions.removeIf(p -> !isRedeemable(p, cart, now));
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
                // findById skips the guards the repository queries apply, so re-impose them here: an
                // arbitrary id must not smuggle in an expired promotion or a code-gated coupon.
                if (manualPromo != null && manualPromo.getCode() == null && isRedeemable(manualPromo, cart, now)) {
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
                if (isRedeemable(coupon, cart, now)) {
                    allPromotions.add(coupon);
                    couponFound = true;
                }
            } else {
                log.warn("Coupon code not found or inactive: {}", cleanCoupon);
            }
        }

        allPromotions.sort((a, b) -> Integer.compare(b.getPriority(), a.getPriority()));

        boolean isGuest = cart.getUser() == null;
        Long userId = isGuest ? null : cart.getUser().getId();
        long successfulOrderCount = 0;
        if (!isGuest) {
            successfulOrderCount = orderRepository.countSuccessfulOrdersByUserEmail(cart.getUser().getEmail());
        }

        List<CartItemResponse> itemResponses = new ArrayList<>();
        BigDecimal originalSubtotal = BigDecimal.ZERO;

        for (CartItem item : cart.getItems()) {
            // Read the variant's live price, not the CartItem.price snapshot taken at add-to-cart
            // time — OrderServiceImpl.createOrder does the same at checkout ("Always store actual
            // market price"), so a price the admin corrects after a customer added the item to
            // their cart takes effect immediately instead of staying stuck at whatever it was
            // (including 0, if the variant briefly had no price set) until the item is re-added.
            BigDecimal livePrice = item.getVariant().getPrice();
            if (item.getBottle() != null) {
                livePrice = livePrice.add(item.getBottle().getPrice());
            }
            // Free items don't add to the subtotal
            if (!item.isFreeItem()) {
                originalSubtotal = originalSubtotal.add(
                        livePrice.multiply(BigDecimal.valueOf(item.getQuantity())));
            }
            CartItemResponse response = CartItemResponse.builder()
                    .id(item.getId())
                    .productId(item.getProduct().getId())
                    .variantId(item.getVariant().getId())
                    .name(item.getProduct().getName())
                    .image(resolveCartItemImage(item.getVariant(), item.getProduct()))
                    .size(item.getVariant().getSize())
                    .quantity(item.getQuantity())
                    .originalPrice(item.isFreeItem() ? BigDecimal.ZERO : livePrice)
                    .discountAmount(BigDecimal.ZERO)
                    .finalPrice(item.isFreeItem() ? BigDecimal.ZERO : livePrice)
                    .appliedPromotions(new ArrayList<>())
                    .freeItem(item.isFreeItem())
                    .freePromotionId(item.getFreePromotionId())
                    .bottle(item.getBottle() != null ? com.alahadattars.dto.bottle.BottleResponse.fromEntity(item.getBottle(), storageService) : null)
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

        // Phase 1: PRODUCT_DISCOUNT, CATEGORY_DISCOUNT, BUY_X_GET_Y
        for (Promotion promo : allPromotions) {
            if (promo.getPromotionType() == PromotionType.FREE_PRODUCT) continue; // handled in Phase 4
            if (hasAppliedNonStackable && !promo.isStackable()) continue;

            if (promo.getPromotionType() == PromotionType.PRODUCT_DISCOUNT
                    || promo.getPromotionType() == PromotionType.CATEGORY_DISCOUNT) {
                boolean promoAppliedToAnyItem = false;
                
                // Volume Tier Evaluation
                PromotionConfiguration config = promo.getConfiguration();
                long totalEligibleQty = 0;
                if (config != null && config.getVolumeTiers() != null && !config.getVolumeTiers().isEmpty()) {
                    for (int i = 0; i < itemResponses.size(); i++) {
                        CartItemResponse itemResponse = itemResponses.get(i);
                        if (itemResponse.isFreeItem()) continue;
                        CartItem cartItem = cart.getItems().get(i);
                        if (isItemEligible(promo, cartItem)) {
                            totalEligibleQty += itemResponse.getQuantity();
                        }
                    }
                }
                
                DiscountType activeDiscountType = promo.getDiscountType();
                BigDecimal activeDiscountValue = promo.getDiscountValue();
                
                if (totalEligibleQty > 0 && config != null && config.getVolumeTiers() != null) {
                    com.alahadattars.entity.PromotionConfiguration.VolumeTier bestTier = null;
                    for (com.alahadattars.entity.PromotionConfiguration.VolumeTier tier : config.getVolumeTiers()) {
                        if (tier.getMinQuantity() != null && totalEligibleQty >= tier.getMinQuantity()) {
                            if (bestTier == null || tier.getMinQuantity() > bestTier.getMinQuantity()) {
                                bestTier = tier;
                            }
                        }
                    }
                    if (bestTier != null) {
                        activeDiscountType = bestTier.getDiscountType();
                        activeDiscountValue = bestTier.getDiscountValue();
                    } else if (promo.getDiscountValue() == null) {
                        // If root promo has no discount and didn't hit a tier, skip.
                        continue;
                    }
                }

                for (int i = 0; i < itemResponses.size(); i++) {
                    CartItemResponse itemResponse = itemResponses.get(i);
                    if (itemResponse.isFreeItem()) continue; // never discount free items
                    
                    CartItem cartItem = cart.getItems().get(i);
                    if (isItemEligible(promo, cartItem)) {
                        BigDecimal itemDiscount = BigDecimal.ZERO;
                        if (activeDiscountType == DiscountType.PERCENTAGE) {
                            itemDiscount = itemResponse.getOriginalPrice().multiply(activeDiscountValue).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
                        } else if (activeDiscountType == DiscountType.FIXED_AMOUNT) {
                            itemDiscount = activeDiscountValue;
                        }
                        itemDiscount = itemDiscount.min(itemResponse.getOriginalPrice());
                        
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
            } else if (promo.getPromotionType() == PromotionType.BUY_X_GET_Y) {
                PromotionConfiguration config = promo.getConfiguration();
                if (config == null) continue;
                
                long buyOnlyQty = 0;
                long getOnlyQty = 0;
                long overlapQty = 0;
                List<CartItemResponse> getCandidates = new ArrayList<>();
                
                // Identify candidates
                for (int i = 0; i < itemResponses.size(); i++) {
                    CartItemResponse itemResponse = itemResponses.get(i);
                    if (itemResponse.isFreeItem()) continue;
                    CartItem cartItem = cart.getItems().get(i);
                    
                    boolean matchesBuy = isItemEligible(promo, cartItem);
                    boolean matchesGet = isVariantEligibleAsFreeGift(cartItem.getVariant(), config);
                    
                    if (matchesBuy && matchesGet) {
                        getCandidates.add(itemResponse);
                        overlapQty += itemResponse.getQuantity();
                    } else if (matchesBuy) {
                        buyOnlyQty += itemResponse.getQuantity();
                    } else if (matchesGet) {
                        getCandidates.add(itemResponse);
                        getOnlyQty += itemResponse.getQuantity();
                    }
                }
                
                long totalAwardableQty = calculateBuyXGetYUnlockedRewards(cart, promo, config);
                long alreadyAdded = cart.getItems().stream()
                        .filter(item -> item.isFreeItem() && promo.getId().equals(item.getFreePromotionId()))
                        .mapToLong(CartItem::getQuantity).sum();
                
                long remainingToAutoDiscount = totalAwardableQty - alreadyAdded;
                
                // If the promotion requires customer selection, we do NOT auto-discount non-free items
                // the user must manually add the item via the UI to get it for free.
                if (config.isAllowCustomerSelection()) {
                    remainingToAutoDiscount = 0; 
                }
                
                if (remainingToAutoDiscount > 0 && !getCandidates.isEmpty()) {
                    // To prevent self-qualification when overlap exists, we logically consume the most expensive items as the "Buy" quota.
                    // This is done by sorting get candidates ASCENDING by price, and taking the cheapest ones as rewards.
                    getCandidates.sort(Comparator.comparing(CartItemResponse::getOriginalPrice));
                    
                    long awardedQty = 0;
                    boolean promoAppliedToAnyItem = false;
                    
                    DiscountType rewardType = config.getRewardDiscountType() != null ? config.getRewardDiscountType() : DiscountType.PERCENTAGE;
                    BigDecimal rewardVal = config.getRewardDiscountValue() != null ? config.getRewardDiscountValue() : new BigDecimal("100");
                    
                    for (CartItemResponse getResp : getCandidates) {
                        if (awardedQty >= remainingToAutoDiscount) break;
                        
                        long qtyToDiscount = Math.min(getResp.getQuantity(), remainingToAutoDiscount - awardedQty);
                        if (qtyToDiscount > 0) {
                            
                            BigDecimal itemDiscount = BigDecimal.ZERO;
                            if (rewardType == DiscountType.PERCENTAGE) {
                                itemDiscount = getResp.getOriginalPrice().multiply(rewardVal).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
                            } else if (rewardType == DiscountType.FIXED_AMOUNT) {
                                itemDiscount = rewardVal;
                            }
                            itemDiscount = itemDiscount.min(getResp.getOriginalPrice());
                            
                            if (itemDiscount.compareTo(BigDecimal.ZERO) > 0) {
                                // Since discount may apply to only a partial quantity of this cart item line, 
                                // we technically would need to split the line item if it's partial.
                                // However, simple cart-level discount aggregation: 
                                // We add the total absolute discount (itemDiscount * qtyToDiscount) to the line's discount.
                                BigDecimal totalLineDiscountForThisPromo = itemDiscount.multiply(BigDecimal.valueOf(qtyToDiscount));
                                getResp.setDiscountAmount(getResp.getDiscountAmount().add(totalLineDiscountForThisPromo));
                                // Recompute final price (which is an average per item if partially discounted, but total logic holds)
                                BigDecimal avgDiscountPerItem = getResp.getDiscountAmount().divide(BigDecimal.valueOf(getResp.getQuantity()), 2, RoundingMode.HALF_UP);
                                getResp.setFinalPrice(getResp.getOriginalPrice().subtract(avgDiscountPerItem).max(BigDecimal.ZERO));
                                
                                totalItemDiscounts = totalItemDiscounts.add(totalLineDiscountForThisPromo);
                                awardedQty += qtyToDiscount;
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

            if (!isCustomerEligible(promo, isGuest, successfulOrderCount, userId)) {
                log.info("[TARGETING] Skipping promo '{}' – customer ineligible", promo.getName());
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

        // Populate available/locked lists from ALL active promotions (exclude FREE_PRODUCT — handled separately)
        List<Promotion> allActive = promotionRepository.findAllActivePromotions(now);
        for (Promotion p : allActive) {
            if (p.getPromotionType() == PromotionType.FREE_PRODUCT) continue;
            if (appliedPromos.contains(p) || lockedPromos.contains(p)) continue;

            if (isRedeemable(p, cart, now)) {
                if (p.getMinCartValue() != null && subtotalAfterItemDiscounts.compareTo(p.getMinCartValue()) < 0) {
                    BigDecimal diff = p.getMinCartValue().subtract(subtotalAfterItemDiscounts);
                    if (diff.compareTo(new BigDecimal("500")) <= 0) {
                        unlockMessages.add("Spend ₹" + diff.setScale(0, java.math.RoundingMode.HALF_UP)
                                + " more to unlock " + p.getName());
                    }
                    lockedPromos.add(p);
                } else {
                    availablePromos.add(p);
                }
            }
        }

        List<PromotionResponse> appliedDto = appliedPromos.stream()
                .map(promotionResponseMapper::toResponse).collect(Collectors.toList());
        List<PromotionResponse> lockedDto = lockedPromos.stream()
                .map(promotionResponseMapper::toResponse).collect(Collectors.toList());
        List<PromotionResponse> availableDto = availablePromos.stream()
                .map(promotionResponseMapper::toResponse).collect(Collectors.toList());

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

        boolean isGuest = cart.getUser() == null;
        Long userId = isGuest ? null : cart.getUser().getId();
        long successfulOrderCount = 0;
        if (!isGuest) {
            successfulOrderCount = orderRepository.countSuccessfulOrdersByUserEmail(cart.getUser().getEmail());
        }

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
            if (promo.getPromotionType() != PromotionType.FREE_PRODUCT && promo.getPromotionType() != PromotionType.BUY_X_GET_Y) continue;
            if (!isCustomerEligible(promo, isGuest, successfulOrderCount, userId)) {
                log.info("[TARGETING] Skipping promo '{}' – customer ineligible", promo.getName());
                continue;
            }
            if (!isPromotionValid(promo)) continue;

            PromotionConfiguration config = promo.getConfiguration();
            if (config == null) continue;
            
            // Only BUY_X_GET_Y with allowCustomerSelection=true populates options (otherwise it auto-discounts existing items)
            if (promo.getPromotionType() == PromotionType.BUY_X_GET_Y && !config.isAllowCustomerSelection()) continue;

            long totalUnlockedQty = 0;
            if (promo.getPromotionType() == PromotionType.FREE_PRODUCT) {
                if (!cartQualifiesForFreeProduct(cart, promo, config)) continue;
                totalUnlockedQty = config.getMaxFreeQuantity() != null ? config.getMaxFreeQuantity() : 1;
            } else if (promo.getPromotionType() == PromotionType.BUY_X_GET_Y) {
                totalUnlockedQty = calculateBuyXGetYUnlockedRewards(cart, promo, config);
                if (totalUnlockedQty <= 0) continue;
            }

            // How many free items from this promo already in cart?
            long alreadyAdded = cart.getItems().stream()
                    .filter(item -> item.isFreeItem() && promo.getId().equals(item.getFreePromotionId()))
                    .mapToLong(CartItem::getQuantity).sum();

            if (alreadyAdded >= totalUnlockedQty) {
                log.debug("[{}] Promo '{}' already fulfilled (added={}, unlocked={})", 
                        promo.getPromotionType(), promo.getName(), alreadyAdded, totalUnlockedQty);
                continue;
            }

            List<ProductVariant> eligible;
            if (config.getFreeVariantIds() != null && !config.getFreeVariantIds().isEmpty()) {
                eligible = productVariantRepository.findEligibleFreeVariantsByIds(config.getFreeVariantIds());
            } else if (config.getFreeScope() == null) {
                // Legacy inference path — unchanged: category + allowedFreeVariantSize via the DB query.
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
            } else {
                // Explicit scope path — retrieve the candidate pool, then filter by size in Java
                // (one place for all three scopes, via sizeMatches).
                List<ProductVariant> candidates = switch (config.getFreeScope()) {
                    case SPECIFIC_PRODUCT -> {
                        if (config.getFreeProductIds() == null || config.getFreeProductIds().isEmpty()) {
                            yield List.<ProductVariant>of();
                        }
                        yield productVariantRepository.findEligibleVariantsByProducts(config.getFreeProductIds());
                    }
                    case CATEGORY -> {
                        List<Long> freeCatIds = resolveFreeCategories(config);
                        if (freeCatIds.isEmpty()) yield List.<ProductVariant>of();
                        else yield productVariantRepository.findEligibleVariantsByCategories(freeCatIds);
                    }
                    case ANY_PRODUCT -> productVariantRepository.findByActiveTrue().stream()
                            .filter(v -> v.getStock() > 0 && v.getProduct() != null && v.getProduct().isActive())
                            .collect(Collectors.toList());
                };

                eligible = candidates.stream()
                        .filter(v -> sizeMatches(v.getSize(), config.getFreeVariantSizes(), config.getAllowedFreeVariantSize()))
                        .collect(Collectors.toList());

                // CATEGORY/ANY_PRODUCT can optionally be further narrowed to specific products;
                // SPECIFIC_PRODUCT already sourced its candidates from freeProductIds above.
                if (config.getFreeScope() != com.alahadattars.enums.PromotionScope.SPECIFIC_PRODUCT
                        && config.getFreeProductIds() != null && !config.getFreeProductIds().isEmpty()) {
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
                        .image(resolveCartItemImage(v, v.getProduct()))
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

    private String resolveCartItemImage(ProductVariant variant, Product product) {
        if (variant == null || product == null) return null;
        String preferredType = variant.getProductType() != null ? variant.getProductType().name() : null;
        return productImageResolver.resolveImage(product.getImages(), preferredType);
    }

    // ─── validateFreeItemEligibility ─────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public void validateFreeItemEligibility(Cart cart, Long promotionId, Long variantId) {
        LocalDateTime now = LocalDateTime.now();

        Promotion promo = promotionRepository.findById(promotionId)
                .orElseThrow(() -> new com.alahadattars.exception.ResourceNotFoundException(
                        "Promotion not found: " + promotionId));

        boolean hasOtherPromoFreeItem = cart.getItems().stream()
                .anyMatch(item -> item.isFreeItem() && item.getFreePromotionId() != null && !item.getFreePromotionId().equals(promotionId));
        if (hasOtherPromoFreeItem) {
            throw new BadRequestException("You can only claim free gifts from one promotion per order.");
        }

        if (promo.getPromotionType() != PromotionType.FREE_PRODUCT && promo.getPromotionType() != PromotionType.BUY_X_GET_Y)
            throw new BadRequestException("Promotion " + promotionId + " does not support free items.");
        if (!promo.isActive())
            throw new BadRequestException("This promotion is currently disabled.");
        if (!isDateValid(promo, now))
            throw new BadRequestException("This promotion has expired or not yet started.");
        if (!isPromotionValid(promo))
            throw new BadRequestException("This promotion is no longer valid.");

        PromotionConfiguration config = promo.getConfiguration();
        if (config == null)
            throw new BadRequestException("Promotion configuration is missing.");

        if (!isWithinPerUserLimit(promo, cart)) {
            throw new BadRequestException("You have already used the promotion '" + promo.getName() + "'.");
        }

        long totalUnlockedQty = 0;
        if (promo.getPromotionType() == PromotionType.FREE_PRODUCT) {
            // Cart must still qualify
            if (!cartQualifiesForFreeProduct(cart, promo, config))
                throw new BadRequestException(
                        "Your cart no longer qualifies for this free product promotion. "
                        + "Please ensure you have the required item and quantity.");
            totalUnlockedQty = config.getMaxFreeQuantity() != null ? config.getMaxFreeQuantity() : 1;
        } else if (promo.getPromotionType() == PromotionType.BUY_X_GET_Y) {
            totalUnlockedQty = calculateBuyXGetYUnlockedRewards(cart, promo, config);
            if (totalUnlockedQty <= 0)
                throw new BadRequestException(
                        "Your cart no longer qualifies for this reward promotion. "
                        + "Please ensure you have the required item and quantity.");
        }

        // Check max free quantity
        long alreadyAdded = cart.getItems().stream()
                .filter(item -> item.isFreeItem() && promo.getId().equals(item.getFreePromotionId()))
                .mapToLong(CartItem::getQuantity).sum();
        if (alreadyAdded >= totalUnlockedQty)
            throw new BadRequestException(
                    "You have already added the maximum number of free items for this promotion.");

        // Check duplicate
        boolean duplicate = cart.getItems().stream()
                .anyMatch(item -> item.isFreeItem()
                        && promo.getId().equals(item.getFreePromotionId())
                        && item.getVariant().getId().equals(variantId));
        if (duplicate)
            throw new BadRequestException("This free item is already in your cart.");

        // Validate the chosen variant is eligible
        ProductVariant chosen = productVariantRepository.findById(variantId)
                .orElseThrow(() -> new com.alahadattars.exception.ResourceNotFoundException(
                        "Variant not found: " + variantId));

        if (!chosen.isActive() || chosen.getStock() <= 0)
            throw new BadRequestException(
                    "The selected free item is out of stock or unavailable.");

        // CRITICAL: single source of truth shared with evaluateFreeProductOptions and
        // validateFreeItemStillValid — a manipulated/stale/wrong-size variant is rejected here.
        if (!isVariantEligibleAsFreeGift(chosen, config)) {
            throw new BadRequestException(
                    "The selected variant '" + chosen.getSize()
                    + "' is not eligible as a free item for this promotion.");
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
                    .map(i -> i.getVariant().getPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (cartTotal.compareTo(promo.getMinCartValue()) < 0) return false;
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
        if (config.getBuyScope() == null) {
            // Legacy inference path — kept byte-for-byte for promotions created before buyScope
            // existed (scope was implicit based on which fields happened to be set).
            // Category filter
            if (config.getBuyCategoryId() != null) {
                if (item.getProduct().getCategory() == null) return false;
                if (!item.getProduct().getCategory().getId().equals(config.getBuyCategoryId())) return false;
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

        // Explicit scope path (buyScope set) — variant-ID list still wins outright if configured,
        // same priority as the legacy path.
        if (config.getBuyVariantIds() != null && !config.getBuyVariantIds().isEmpty()) {
            return config.getBuyVariantIds().contains(item.getVariant().getId());
        }

        switch (config.getBuyScope()) {
            case SPECIFIC_PRODUCT -> {
                // Specific product targeting now strictly requires buyVariantIds.
                // If execution reaches here, buyVariantIds was null/empty or didn't match.
                return false;
            }
            case CATEGORY -> {
                if (config.getBuyCategoryId() == null || item.getProduct().getCategory() == null
                        || !item.getProduct().getCategory().getId().equals(config.getBuyCategoryId())) return false;
            }
            case ANY_PRODUCT -> {
                // No category/product restriction — any active product may contribute.
            }
        }

        return sizeMatches(item.getVariant().getSize(), config.getBuyVariantSizes(), config.getBuyVariantSize());
    }

    /**
     * Normalizes both sides (lowercase, spaces stripped) the same way
     * ProductVariantServiceImpl.validateVariantSize and the DB-level free-variant query already
     * do — "12ml" and "12 ml" must match. allowedSizes (if non-empty) wins over legacySingle; if
     * neither is configured, no size constraint applies (any size counts).
     */
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
        String normalizedActual = actualSize.toLowerCase().replace(" ", "");
        for (String allowed : effective) {
            if (allowed != null && normalizedActual.equals(allowed.toLowerCase().replace(" ", ""))) {
                return true;
            }
        }
        return false;
    }

    /**
     * Single source of truth for "is this variant a valid free gift under this promotion config" —
     * used by {@link #evaluateFreeProductOptions} (as a candidate filter for non-legacy scopes),
     * {@link #validateFreeItemEligibility} (checkout-time anti-fraud check), and
     * {@link #validateFreeItemStillValid} (cart-time staleness check). Keeping all three on one
     * method guarantees they can never disagree about what "eligible" means.
     */
    private boolean isVariantEligibleAsFreeGift(ProductVariant variant, PromotionConfiguration config) {
        if (config.getFreeVariantIds() != null && !config.getFreeVariantIds().isEmpty()) {
            return config.getFreeVariantIds().contains(variant.getId());
        }

        if (config.getFreeScope() == null) {
            // Legacy inference path — same category/size/product checks evaluateFreeProductOptions's
            // DB query and the old ad-hoc checks enforced, just consolidated into Java and
            // consistently space-normalized (see sizeMatches) instead of the old exact-trim-only
            // comparison the two manual checks used, which silently rejected "12ml" vs "12 ml".
            List<Long> freeCatIds = resolveFreeCategories(config);
            Long catId = variant.getProduct().getCategory() != null
                    ? variant.getProduct().getCategory().getId() : null;
            if (catId == null || !freeCatIds.contains(catId)) return false;
            if (!sizeMatches(variant.getSize(), null, config.getAllowedFreeVariantSize())) return false;
            if (config.getFreeProductIds() != null && !config.getFreeProductIds().isEmpty()) {
                return config.getFreeProductIds().contains(variant.getProduct().getId());
            }
            return true;
        }

        switch (config.getFreeScope()) {
            case SPECIFIC_PRODUCT -> {
                if (config.getFreeProductIds() == null
                        || !config.getFreeProductIds().contains(variant.getProduct().getId())) return false;
            }
            case CATEGORY -> {
                List<Long> freeCatIds = resolveFreeCategories(config);
                Long catId = variant.getProduct().getCategory() != null
                        ? variant.getProduct().getCategory().getId() : null;
                if (catId == null || !freeCatIds.contains(catId)) return false;
                if (config.getFreeProductIds() != null && !config.getFreeProductIds().isEmpty()
                        && !config.getFreeProductIds().contains(variant.getProduct().getId())) return false;
            }
            case ANY_PRODUCT -> {
                if (config.getFreeProductIds() != null && !config.getFreeProductIds().isEmpty()
                        && !config.getFreeProductIds().contains(variant.getProduct().getId())) return false;
            }
        }

        return sizeMatches(variant.getSize(), config.getFreeVariantSizes(), config.getAllowedFreeVariantSize());
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
    @Override
    @Transactional(readOnly = true)
    public boolean isFreeCartItemStillValid(Cart cart, CartItem freeItem) {
        return validateFreeItemStillValid(cart, freeItem, null);
    }

    private boolean validateFreeItemStillValid(Cart cart, CartItem freeItem, String couponCode) {
        if (freeItem.getFreePromotionId() == null) return false;
        LocalDateTime now = LocalDateTime.now();
        Optional<Promotion> promoOpt = promotionRepository.findById(freeItem.getFreePromotionId());
        if (promoOpt.isEmpty()) return false;
        Promotion promo = promoOpt.get();
        if (!promo.isActive() || !isDateValid(promo, now) || !isPromotionValid(promo)) return false;
        PromotionConfiguration config = promo.getConfiguration();
        if (config == null) return false;

        if (!isWithinPerUserLimit(promo, cart)) {
            return false;
        }
        
        long totalUnlockedQty = 0;
        if (promo.getPromotionType() == PromotionType.FREE_PRODUCT) {
            if (!cartQualifiesForFreeProduct(cart, promo, config)) return false;
            totalUnlockedQty = config.getMaxFreeQuantity() != null ? config.getMaxFreeQuantity() : 1;
        } else if (promo.getPromotionType() == PromotionType.BUY_X_GET_Y) {
            totalUnlockedQty = calculateBuyXGetYUnlockedRewards(cart, promo, config);
            if (totalUnlockedQty <= 0) return false;
        } else {
            return false;
        }
        
        // We do not check alreadyAdded < totalUnlockedQty here, because this item IS one of the already added items, 
        // and we want it to remain valid if the cart still qualifies for it!
        // We only care that totalUnlockedQty > 0. (Actually, if there are multiple free items, and they reduce qty,
        // the cart might have 2 free items but only 1 unlocked. In evaluateCart we should probably prune them,
        // but historically this only checks qualification, so returning false only if totalUnlockedQty <= 0 is fine).
        
        // Check variant still matches — was previously checking only allowedFreeVariantSize, which
        // wrongly flagged every freeVariantIds-based free item as stale regardless of validity.
        if (!isVariantEligibleAsFreeGift(freeItem.getVariant(), config)) return false;
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

    /**
     * Full redemption check: active, inside its date window, and within both the global and per-user
     * redemption limits. Prefer this over {@link #isPromotionValid} wherever a cart is in hand — the
     * latter checks neither dates nor the per-user cap.
     */
    private boolean isRedeemable(Promotion promotion, Cart cart, LocalDateTime now) {
        if (!isPromotionValid(promotion)) return false;
        if (!isDateValid(promotion, now)) return false;
        return isWithinPerUserLimit(promotion, cart);
    }

    private boolean isWithinPerUserLimit(Promotion promotion, Cart cart) {
        Integer perUserLimit = promotion.getPerUserLimit();
        if (perUserLimit == null || perUserLimit <= 0) return true;
        if (cart == null || cart.getUser() == null || cart.getUser().getId() == null) return true;

        long alreadyRedeemed = promotionRedemptionRepository
                .countByPromotionIdAndUserId(promotion.getId(), cart.getUser().getId());
        if (alreadyRedeemed >= perUserLimit) {
            log.info("Promotion '{}' exhausted for user {} ({} of {} redemptions used)",
                    promotion.getName(), cart.getUser().getId(), alreadyRedeemed, perUserLimit);
            return false;
        }
        return true;
    }

    private boolean isDateValid(Promotion promo, LocalDateTime now) {
        if (promo.getStartDate() != null && now.isBefore(promo.getStartDate())) return false;
        if (promo.getEndDate() != null && now.isAfter(promo.getEndDate())) return false;
        return true;
    }

    private CartItem findCartItem(Cart cart, Long itemId) {
        if (itemId == null) return null;
        return cart.getItems().stream()
                .filter(i -> i.getId() != null && i.getId().equals(itemId))
                .findFirst().orElse(null);
    }

    private boolean isCustomerEligible(Promotion promo, boolean isGuest, long successfulOrderCount, Long userId) {
        boolean isFirstOrderType = promo.getPromotionType() == PromotionType.FIRST_ORDER;
        PromotionConfiguration config = promo.getConfiguration();
        boolean firstOrderFlag = config != null && config.isFirstOrderOnly();
        
        Integer minPrevious = (config != null) ? config.getMinPreviousOrders() : null;
        List<Long> allowedUserIds = (config != null) ? config.getAllowedUserIds() : null;

        // Condition ANDing: if a promotion has contradictory configuration, it deterministically fails.
        if ((isFirstOrderType || firstOrderFlag) && minPrevious != null && minPrevious > 0) {
            return false;
        }

        if (isGuest) {
            // Guests automatically fail FIRST_ORDER, minPreviousOrders, and user targeting
            if (isFirstOrderType || firstOrderFlag) return false;
            if (minPrevious != null && minPrevious > 0) return false;
            if (allowedUserIds != null && !allowedUserIds.isEmpty()) return false;
            return true;
        }

        // Authenticated users
        if ((isFirstOrderType || firstOrderFlag) && successfulOrderCount > 0) {
            return false;
        }

        if (minPrevious != null && successfulOrderCount < minPrevious) {
            return false;
        }

        if (allowedUserIds != null && !allowedUserIds.isEmpty()) {
            if (!allowedUserIds.contains(userId)) {
                return false;
            }
        }

        return true;
    }


    private boolean isItemEligible(Promotion promo, CartItem cartItem) {
        ItemEligibilityCondition condition = eligibilityConditionFactory.getCondition(promo);
        if (condition != null) {
            return condition.isItemEligible(promo, cartItem);
        }
        return false;
    }

    private boolean isProductEligible(Promotion promo, Product product) {
        ItemEligibilityCondition condition = eligibilityConditionFactory.getCondition(promo);
        if (condition != null) {
            return condition.isProductEligible(promo, product);
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

    /**
     * Calculates the total number of reward quantities a cart has unlocked under a BUY_X_GET_Y
     * promotion, based on Phase 2A loop logic (Buy vs Get vs Overlap consumption).
     * Honors minQty, maxRewardQuantityPerOrder, and repeatReward.
     */
    private long calculateBuyXGetYUnlockedRewards(Cart cart, Promotion promo, PromotionConfiguration config) {
        long buyOnlyQty = 0;
        long getOnlyQty = 0;
        long overlapQty = 0;

        for (CartItem item : cart.getItems()) {
            if (item.isFreeItem()) continue; // Ignore free items for qualification

            boolean matchesBuy = isItemEligible(promo, item);
            boolean matchesGet = isVariantEligibleAsFreeGift(item.getVariant(), config);

            if (matchesBuy && matchesGet) {
                overlapQty += item.getQuantity();
            } else if (matchesBuy) {
                buyOnlyQty += item.getQuantity();
            } else if (matchesGet) {
                getOnlyQty += item.getQuantity();
            }
        }

        int minQty = config.getMinPurchaseQuantity() != null ? config.getMinPurchaseQuantity() : 1;
        int getQtyLimit = config.getMaxFreeQuantity() != null ? config.getMaxFreeQuantity() : 1;

        long totalAwardableQty = 0;
        long bOnly = buyOnlyQty;
        long oQty = overlapQty;
        long gOnly = getOnlyQty;
        
        System.out.println("calculateBuyXGetYUnlockedRewards: bOnly=" + bOnly + ", oQty=" + oQty + ", gOnly=" + gOnly + ", minQty=" + minQty + ", getQtyLimit=" + getQtyLimit);

        while (true) {
            // 1. Reserve BUY
            long neededBuy = minQty;
            long takeFromBuyOnly = Math.min(bOnly, neededBuy);
            bOnly -= takeFromBuyOnly;
            neededBuy -= takeFromBuyOnly;

            long takeFromOverlapForBuy = Math.min(oQty, neededBuy);
            oQty -= takeFromOverlapForBuy;
            neededBuy -= takeFromOverlapForBuy;

            if (neededBuy > 0) {
                break; // Stop
            }

            // 2. Grant GET rewards
            long neededGet = getQtyLimit;
            long takeFromGetOnly = Math.min(gOnly, neededGet);
            gOnly -= takeFromGetOnly;
            neededGet -= takeFromGetOnly;

            long takeFromOverlapForGet = Math.min(oQty, neededGet);
            oQty -= takeFromOverlapForGet;
            neededGet -= takeFromOverlapForGet;

            long awardedInThisBundle = getQtyLimit - neededGet;
            totalAwardableQty += awardedInThisBundle;

            if (!config.isRepeatReward()) {
                break;
            }
        }

        if (config.getMaxRewardQuantityPerOrder() != null) {
            totalAwardableQty = Math.min(totalAwardableQty, config.getMaxRewardQuantityPerOrder());
        }
        return totalAwardableQty;
    }
}
