package com.alahadattars.billing.pos;

import com.alahadattars.billing.invoice.InvoiceChannel;
import com.alahadattars.billing.invoice.InvoiceCustomerSnapshot;
import com.alahadattars.billing.invoice.InvoiceDocumentService;
import com.alahadattars.billing.invoice.InvoiceLineSnapshot;
import com.alahadattars.billing.invoice.InvoiceNumberAllocator;
import com.alahadattars.billing.invoice.InvoiceNumberValue;
import com.alahadattars.billing.invoice.InvoiceSnapshot;
import com.alahadattars.billing.invoice.InvoiceSourceType;
import com.alahadattars.billing.invoice.InvoiceTaxSnapshot;
import com.alahadattars.billing.sale.PosTenderSnapshot;
import com.alahadattars.billing.sale.TenderMethod;
import com.alahadattars.billing.security.AuthenticatedBillingAdmin;
import com.alahadattars.entity.Bottle;
import com.alahadattars.entity.Category;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.Promotion;
import com.alahadattars.entity.PromotionRedemption;
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.exception.ConflictException;
import com.alahadattars.repository.BottleRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.PromotionRedemptionRepository;
import com.alahadattars.repository.PromotionRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;

/** All POS sale, inventory, promotion, tender, invoice and PDF writes share this transaction. */
@Service
public class PosSaleTransactionService {
    private static final BigDecimal MAX_NUMERIC_12_2 = new BigDecimal("9999999999.99");

    private final EntityManager entityManager;
    private final PosQuoteService quoteService;
    private final PosSaleJdbcRepository saleRepository;
    private final ProductVariantRepository variantRepository;
    private final BottleRepository bottleRepository;
    private final PromotionRepository promotionRepository;
    private final PromotionRedemptionRepository redemptionRepository;
    private final JdbcTemplate jdbc;
    private final PosInvoiceConfiguration invoiceConfiguration;
    private final InvoiceNumberAllocator invoiceNumberAllocator;
    private final InvoiceDocumentService invoiceDocumentService;

    public PosSaleTransactionService(EntityManager entityManager, PosQuoteService quoteService,
                                    PosSaleJdbcRepository saleRepository,
                                    ProductVariantRepository variantRepository, BottleRepository bottleRepository,
                                    PromotionRepository promotionRepository,
                                    PromotionRedemptionRepository redemptionRepository, JdbcTemplate jdbc,
                                    PosInvoiceConfiguration invoiceConfiguration,
                                    InvoiceNumberAllocator invoiceNumberAllocator,
                                    InvoiceDocumentService invoiceDocumentService) {
        this.entityManager = entityManager;
        this.quoteService = quoteService;
        this.saleRepository = saleRepository;
        this.variantRepository = variantRepository;
        this.bottleRepository = bottleRepository;
        this.promotionRepository = promotionRepository;
        this.redemptionRepository = redemptionRepository;
        this.jdbc = jdbc;
        this.invoiceConfiguration = invoiceConfiguration;
        this.invoiceNumberAllocator = invoiceNumberAllocator;
        this.invoiceDocumentService = invoiceDocumentService;
    }

    @Transactional
    public PosSaleFinalizeResponse finalizeInTransaction(String scopedKey, String requestHash,
                                                         PosSaleFinalizeRequest request,
                                                         AuthenticatedBillingAdmin admin) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()
                || !TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("POS finalization requires an active Spring transaction.");
        }

        var committedBeforeLock = saleRepository.findByIdempotencyKey(scopedKey);
        if (committedBeforeLock.isPresent()) {
            return PosSaleFinalizationService.replayOrReject(committedBeforeLock.get(), requestHash, admin.userId());
        }

        lockCatalogRows(request.quote());
        // A concurrent request with the same key may have committed while this transaction
        // waited on catalog row locks. Re-read at READ COMMITTED before evaluating stock or writing.
        var committedWhileWaiting = saleRepository.findByIdempotencyKey(scopedKey);
        if (committedWhileWaiting.isPresent()) {
            return PosSaleFinalizationService.replayOrReject(committedWhileWaiting.get(), requestHash, admin.userId());
        }
        PosQuoteResponse quote = quoteService.quote(request.quote(), admin);
        quote = stabilizePromotionSet(request.quote(), admin, quote);
        if (!quote.quoteFingerprint().equalsIgnoreCase(request.confirmedQuoteFingerprint())) {
            throw new PosQuoteChangedException(quote);
        }
        if (!quote.allLinesAvailable()) {
            throw new ConflictException("Requested stock is no longer available.", "POS_STOCK_UNAVAILABLE");
        }

        invoiceConfiguration.validateConfigured();
        ensureNoGstConfiguration();
        validateMoneyPrecision(quote);
        PosTenderSnapshot tender = calculateTender(request.tender(), quote.payableAmount());

        Instant completedAt = Instant.now();
        UUID saleKey = UUID.randomUUID();
        long saleId = saleRepository.insertSale(saleKey, scopedKey, requestHash, request.quote(), quote,
                quote.quoteFingerprint(), admin.userId(), admin.email(), completedAt);

        deductInventory(quote);
        Map<Long, Promotion> claimedPromotions = claimPromotions(saleId, quote);

        Map<String, Long> saleLineIds = new LinkedHashMap<>();
        for (PosQuoteResponse.Line line : quote.lines()) {
            saleLineIds.put(line.lineKey(), saleRepository.insertLine(saleId, line));
        }
        for (PosQuoteResponse.ManualDiscountPreview discount : quote.manualDiscounts()) {
            Long saleLineId = discount.scope() == com.alahadattars.billing.discount.DiscountScope.ITEM
                    ? saleLineIds.get(discount.lineKey()) : null;
            if (discount.scope() == com.alahadattars.billing.discount.DiscountScope.ITEM && saleLineId == null) {
                throw new IllegalStateException("A manual discount points to a missing POS sale line.");
            }
            saleRepository.insertDiscountApplication(saleId, saleLineId, discount, admin.userId());
        }
        for (Promotion promotion : claimedPromotions.values()) {
            saleRepository.insertPromotion(saleId, new PosQuoteResponse.PromotionSummary(
                    promotion.getId(), promotion.getName(), promotion.getCode(), promotion.getPromotionType()));
        }

        InvoiceNumberValue number = invoiceNumberAllocator.next(InvoiceChannel.POS,
                invoiceConfiguration.financialYear());
        String invoiceNumber = invoiceConfiguration.format(number);
        UUID invoiceKey = UUID.randomUUID();
        Instant issuedAt = Instant.now();
        InvoiceSnapshot snapshot = invoiceSnapshot(invoiceKey, invoiceNumber, saleId, issuedAt, quote, request.quote());
        long invoiceId = invoiceDocumentService.generateAndStore(snapshot, number.financialYear());
        saleRepository.insertTender(saleId, tender.method(), tender.salePayable(), tender.amountReceived(),
                tender.changeReturned(), tender.amountApplied(), tender.transactionReference(), admin.userId());

        return new PosSaleFinalizeResponse(saleId, saleKey, "COMPLETED", invoiceId, invoiceNumber, issuedAt,
                quote.quoteFingerprint(), quote.subtotal(), quote.totalPromotionDiscount(), quote.manualDiscount(),
                quote.payableAmount(), tender.method(), tender.amountReceived(), tender.changeReturned(),
                tender.amountApplied(), false);
    }

    private void lockCatalogRows(PosQuoteRequest request) {
        Set<Long> variantIds = new TreeSet<>();
        request.lines().forEach(line -> variantIds.add(line.variantId()));
        if (request.freeRewards() != null) request.freeRewards().forEach(reward -> variantIds.add(reward.variantId()));

        Map<Long, ProductVariant> variants = new LinkedHashMap<>();
        Set<Long> productIds = new TreeSet<>();
        Set<Long> categoryIds = new TreeSet<>();
        for (Long id : variantIds) {
            ProductVariant variant = entityManager.find(ProductVariant.class, id, LockModeType.PESSIMISTIC_WRITE);
            if (variant == null) throw new ConflictException("A selected variant is no longer available.", "POS_CATALOG_CHANGED");
            variants.put(id, variant);
            Product product = variant.getProduct();
            if (product != null) {
                productIds.add(product.getId());
                if (product.getCategory() != null) categoryIds.add(product.getCategory().getId());
            }
        }
        for (Long id : productIds) entityManager.find(Product.class, id, LockModeType.PESSIMISTIC_WRITE);
        for (Long id : categoryIds) entityManager.find(Category.class, id, LockModeType.PESSIMISTIC_WRITE);

        Set<Long> bottleIds = new TreeSet<>();
        request.lines().stream().map(PosQuoteRequest.Line::bottleId).filter(java.util.Objects::nonNull)
                .forEach(bottleIds::add);
        for (Long id : bottleIds) {
            if (entityManager.find(Bottle.class, id, LockModeType.PESSIMISTIC_WRITE) == null) {
                throw new ConflictException("A selected bottle is no longer available.", "POS_CATALOG_CHANGED");
            }
        }
    }

    private PosQuoteResponse stabilizePromotionSet(PosQuoteRequest request, AuthenticatedBillingAdmin admin,
                                                   PosQuoteResponse firstQuote) {
        PosQuoteResponse quote = firstQuote;
        Set<Long> locked = new TreeSet<>();
        for (int pass = 0; pass < 5; pass++) {
            Set<Long> candidates = candidatePromotionIds(quote);
            List<Long> newIds = candidates.stream().filter(id -> !locked.contains(id)).toList();
            for (Long id : newIds) {
                Promotion promotion = entityManager.find(Promotion.class, id);
                if (promotion == null) {
                    throw new PosQuoteChangedException(quoteService.quote(request, admin));
                }
                entityManager.refresh(promotion, LockModeType.PESSIMISTIC_WRITE);
                locked.add(id);
            }
            PosQuoteResponse refreshed = quoteService.quote(request, admin);
            Set<Long> refreshedCandidates = candidatePromotionIds(refreshed);
            if (locked.containsAll(refreshedCandidates) && refreshedCandidates.equals(candidates)) {
                return refreshed;
            }
            quote = refreshed;
        }
        throw new PosQuoteChangedException(quoteService.quote(request, admin));
    }

    private static Set<Long> candidatePromotionIds(PosQuoteResponse quote) {
        Set<Long> ids = new TreeSet<>();
        quote.appliedPromotions().forEach(promotion -> ids.add(promotion.id()));
        quote.availablePromotions().forEach(promotion -> ids.add(promotion.id()));
        quote.lockedPromotions().forEach(promotion -> ids.add(promotion.id()));
        quote.lines().stream().map(PosQuoteResponse.Line::freePromotionId)
                .filter(java.util.Objects::nonNull).forEach(ids::add);
        return ids;
    }

    private Map<Long, Promotion> claimPromotions(long saleId, PosQuoteResponse quote) {
        Set<Long> ids = new TreeSet<>();
        quote.appliedPromotions().forEach(promotion -> ids.add(promotion.id()));
        quote.lines().stream().map(PosQuoteResponse.Line::freePromotionId)
                .filter(java.util.Objects::nonNull).forEach(ids::add);
        Map<Long, Promotion> claimed = new LinkedHashMap<>();
        for (Long id : ids) {
            Promotion promotion = entityManager.find(Promotion.class, id);
            if (promotion == null || !promotion.isActive() || (promotion.getPerUserLimit() != null
                    && promotion.getPerUserLimit() > 0)) {
                throw new PosQuoteChangedException(quote);
            }
            if (promotionRepository.claimRedemption(id) != 1) {
                throw new ConflictException("A promotion's global redemption limit has been reached.",
                        "POS_PROMOTION_EXHAUSTED");
            }
            PromotionRedemption redemption = PromotionRedemption.builder()
                    .promotion(promotion).user(null).guestEmail(null).orderId(null).posSaleId(saleId).build();
            redemptionRepository.save(redemption);
            claimed.put(id, promotion);
        }
        if (!claimed.isEmpty()) redemptionRepository.flush();
        return claimed;
    }

    private void deductInventory(PosQuoteResponse quote) {
        Map<Long, Integer> variantDemand = new java.util.TreeMap<>();
        Map<Long, Integer> bottleDemand = new java.util.TreeMap<>();
        for (PosQuoteResponse.Line line : quote.lines()) {
            variantDemand.merge(line.variantId(), line.quantity(), Math::addExact);
            if (line.bottleId() != null) bottleDemand.merge(line.bottleId(), line.quantity(), Math::addExact);
        }
        for (Map.Entry<Long, Integer> demand : variantDemand.entrySet()) {
            if (variantRepository.decrementStock(demand.getKey(), demand.getValue()) != 1) {
                throw new ConflictException("Variant stock changed before the sale could be completed.",
                        "POS_VARIANT_STOCK_UNAVAILABLE");
            }
        }
        for (Map.Entry<Long, Integer> demand : bottleDemand.entrySet()) {
            if (bottleRepository.decrementStock(demand.getKey(), demand.getValue()) != 1) {
                throw new ConflictException("Bottle stock changed before the sale could be completed.",
                        "POS_BOTTLE_STOCK_UNAVAILABLE");
            }
        }
    }

    private void ensureNoGstConfiguration() {
        List<String> rows = jdbc.query("""
                SELECT gst_status, gstin, gst_enabled, tax_mode
                FROM billing_tax_configuration WHERE singleton_id = 1 FOR SHARE
                """, (rs, rowNum) -> rs.getString("gst_status") + "|" + rs.getString("gstin") + "|"
                + rs.getBoolean("gst_enabled") + "|" + rs.getString("tax_mode"));
        if (rows.size() != 1 || !"UNREGISTERED|null|false|NO_GST".equals(rows.get(0))) {
            throw new ConflictException("Billing tax configuration is not the approved NO_GST setup.",
                    "POS_TAX_CONFIGURATION_UNAVAILABLE");
        }
    }

    private static PosTenderSnapshot calculateTender(PosSaleFinalizeRequest.Tender request, BigDecimal payable) {
        BigDecimal received = money(request.amountReceived());
        BigDecimal due = money(payable);
        if (request.method() == TenderMethod.CASH) {
            if (received.compareTo(due) < 0) {
                throw new BadRequestException("Cash received cannot be less than the sale payable.");
            }
            return new PosTenderSnapshot(request.method(), due, received, money(received.subtract(due)), due,
                    clean(request.transactionReference()));
        }
        if (received.compareTo(due) != 0) {
            throw new BadRequestException("UPI/card amount received must equal the sale payable.");
        }
        return new PosTenderSnapshot(request.method(), due, received, BigDecimal.ZERO.setScale(2), due,
                clean(request.transactionReference()));
    }

    private InvoiceSnapshot invoiceSnapshot(UUID invoiceKey, String invoiceNumber, long saleId,
                                           Instant issuedAt, PosQuoteResponse quote,
                                           PosQuoteRequest request) {
        List<InvoiceLineSnapshot> lines = new ArrayList<>(quote.lines().size());
        int lineNumber = 1;
        for (PosQuoteResponse.Line line : quote.lines()) {
            lines.add(new InvoiceLineSnapshot(lineNumber++, line.productId(), line.variantId(), line.productName(),
                    line.variantSize(), line.quantity(), line.variantUnitPrice(), line.bottleId(), line.bottleName(),
                    line.bottleUnitPrice(), line.promotionDiscount(), line.manualDiscount(), line.finalLineTotal(),
                    line.freeItem(), line.freePromotionId()));
        }
        InvoiceCustomerSnapshot customer = clean(request.customerName()) == null
                && clean(request.customerMobile()) == null && clean(request.customerEmail()) == null
                ? null : new InvoiceCustomerSnapshot(clean(request.customerName()), clean(request.customerMobile()),
                clean(request.customerEmail()));
        return new InvoiceSnapshot(invoiceKey, invoiceNumber, InvoiceChannel.POS, InvoiceSourceType.POS_SALE,
                saleId, issuedAt, invoiceConfiguration.sellerSnapshot(), customer, lines, quote.subtotal(),
                quote.totalPromotionDiscount(), quote.manualDiscount(), quote.payableAmount(),
                InvoiceTaxSnapshot.noGst(), invoiceConfiguration.unregisteredNotice());
    }

    private static void validateMoneyPrecision(PosQuoteResponse quote) {
        List<BigDecimal> values = new ArrayList<>(List.of(quote.subtotal(), quote.totalPromotionDiscount(),
                quote.manualDiscount(), quote.payableAmount()));
        quote.lines().forEach(line -> values.addAll(List.of(line.lineSubtotal(), line.promotionDiscount(),
                line.manualDiscount(), line.finalLineTotal())));
        if (values.stream().anyMatch(value -> value == null || value.signum() < 0
                || value.scale() > 2 || value.compareTo(MAX_NUMERIC_12_2) > 0)) {
            throw new BadRequestException("A POS amount exceeds the supported currency precision.");
        }
    }

    private static BigDecimal money(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
