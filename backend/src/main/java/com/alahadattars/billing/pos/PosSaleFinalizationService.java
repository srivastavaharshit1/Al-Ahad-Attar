package com.alahadattars.billing.pos;

import com.alahadattars.billing.security.AuthenticatedBillingAdmin;
import com.alahadattars.exception.ConflictException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;

/** Non-transactional idempotency boundary. The proxied transaction worker owns each sale attempt. */
@Service
public class PosSaleFinalizationService {
    private final PosSaleJdbcRepository repository;
    private final PosSaleTransactionService transactionService;

    public PosSaleFinalizationService(PosSaleJdbcRepository repository,
                                      PosSaleTransactionService transactionService) {
        this.repository = repository;
        this.transactionService = transactionService;
    }

    public PosSaleFinalizeResponse finalizeSale(String clientKey, PosSaleFinalizeRequest request,
                                                AuthenticatedBillingAdmin admin) {
        validateClientKey(clientKey);
        Objects.requireNonNull(request, "finalization request is required");
        Objects.requireNonNull(admin, "authenticated Admin is required");

        String scopedKey = admin.userId() + ":" + clientKey.trim();
        String requestHash = fingerprint(request, admin.userId());
        var existing = repository.findByIdempotencyKey(scopedKey);
        if (existing.isPresent()) return replayOrReject(existing.get(), requestHash, admin.userId());

        try {
            return transactionService.finalizeInTransaction(
                    scopedKey, requestHash, request, admin);
        } catch (DataIntegrityViolationException duplicateOrInvalidWrite) {
            // A concurrent duplicate insert waits on the database unique constraint. The failed
            // worker transaction has fully rolled back before this lookup occurs.
            var winner = repository.findByIdempotencyKey(scopedKey);
            if (winner.isPresent()) return replayOrReject(winner.get(), requestHash, admin.userId());
            throw duplicateOrInvalidWrite;
        }
    }

    static PosSaleFinalizeResponse replayOrReject(
            PosSaleJdbcRepository.ExistingSale existing, String requestHash, long adminId) {
        if (existing.adminId() != adminId || !MessageDigest.isEqual(
                existing.requestHash().getBytes(StandardCharsets.US_ASCII),
                requestHash.getBytes(StandardCharsets.US_ASCII))) {
            throw new ConflictException("This idempotency key was already used with a different request.",
                    "IDEMPOTENCY_KEY_REUSED");
        }
        PosSaleFinalizeResponse original = existing.response();
        if (original.invoiceId() <= 0 || original.invoiceNumber() == null || original.tenderMethod() == null) {
            throw new IllegalStateException("A completed idempotent POS sale is missing its invoice or tender record.");
        }
        return new PosSaleFinalizeResponse(original.saleId(), original.saleKey(), original.status(),
                original.invoiceId(), original.invoiceNumber(), original.issuedAt(), original.quoteFingerprint(),
                original.subtotal(), original.promotionDiscount(), original.manualDiscount(), original.payableAmount(),
                original.tenderMethod(), original.amountReceived(), original.changeReturned(), original.amountApplied(), true);
    }

    private static void validateClientKey(String key) {
        if (key == null || !key.matches("^[A-Za-z0-9_-]{16,64}$")) {
            throw new ConflictException("A valid Idempotency-Key header is required.", "IDEMPOTENCY_KEY_REQUIRED");
        }
    }

    private static String fingerprint(PosSaleFinalizeRequest request, long adminId) {
        StringBuilder canonical = new StringBuilder();
        appendField(canonical, "schema", "pos-finalize-v1");
        appendField(canonical, "adminId", adminId);
        appendField(canonical, "confirmedQuoteFingerprint", request.confirmedQuoteFingerprint() == null
                ? null : request.confirmedQuoteFingerprint().toLowerCase(java.util.Locale.ROOT));
        PosQuoteRequest quote = request.quote();
        appendField(canonical, "couponCode", quote.couponCode());
        appendField(canonical, "customerName", quote.customerName());
        appendField(canonical, "customerMobile", quote.customerMobile());
        appendField(canonical, "customerEmail", quote.customerEmail());
        appendField(canonical, "lines.count", quote.lines().size());
        quote.lines().stream().sorted(Comparator.comparing(PosQuoteRequest.Line::lineKey)).forEach(line -> {
            append(canonical, "line");
            appendField(canonical, "lineKey", line.lineKey());
            appendField(canonical, "productId", line.productId());
            appendField(canonical, "variantId", line.variantId());
            appendField(canonical, "bottleId", line.bottleId());
            appendField(canonical, "quantity", line.quantity());
        });
        int rewardCount = quote.freeRewards() == null ? 0 : quote.freeRewards().size();
        appendField(canonical, "freeRewards.count", rewardCount);
        if (quote.freeRewards() != null) {
            quote.freeRewards().stream().sorted(Comparator.comparing(PosQuoteRequest.FreeReward::promotionId)
                    .thenComparing(PosQuoteRequest.FreeReward::variantId)).forEach(reward -> {
                append(canonical, "freeReward");
                appendField(canonical, "promotionId", reward.promotionId());
                appendField(canonical, "variantId", reward.variantId());
            });
        }
        int discountCount = quote.manualDiscounts() == null ? 0 : quote.manualDiscounts().size();
        appendField(canonical, "manualDiscounts.count", discountCount);
        if (quote.manualDiscounts() != null) {
            quote.manualDiscounts().stream().sorted(Comparator
                    .comparing((PosQuoteRequest.ManualDiscount d) -> String.valueOf(d.scope()))
                    .thenComparing(d -> String.valueOf(d.lineKey()))
                    .thenComparing(d -> String.valueOf(d.type()))
                    .thenComparing(d -> decimal(d.value()))
                    .thenComparing(d -> String.valueOf(d.reason()))).forEach(discount -> {
                append(canonical, "manualDiscount");
                appendField(canonical, "scope", discount.scope());
                appendField(canonical, "lineKey", discount.lineKey());
                appendField(canonical, "type", discount.type());
                appendField(canonical, "value", decimal(discount.value()));
                appendField(canonical, "reason", discount.reason());
            });
        }
        appendField(canonical, "tender.method", request.tender().method());
        appendField(canonical, "tender.amountReceived", decimal(request.tender().amountReceived()));
        appendField(canonical, "tender.transactionReference", request.tender().transactionReference());
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(canonical.toString().getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is not available", impossible);
        }
    }

    private static String decimal(java.math.BigDecimal value) {
        return value == null ? null : value.stripTrailingZeros().toPlainString();
    }

    private static void append(StringBuilder target, Object value) {
        if (value == null) {
            target.append("N|");
            return;
        }
        String text = String.valueOf(value);
        target.append('V').append(text.length()).append(':').append(text).append('|');
    }

    private static void appendField(StringBuilder target, String name, Object value) {
        append(target, name);
        append(target, value);
    }
}
