package com.alahadattars.billing.pos;

import com.alahadattars.billing.sale.TenderMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public class PosSaleJdbcRepository {
    private final JdbcTemplate jdbc;

    public PosSaleJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public long insertSale(UUID saleKey, String idempotencyKey, String requestHash,
                           PosQuoteRequest quoteRequest, PosQuoteResponse quote,
                           String confirmedQuoteFingerprint, long adminId, String adminEmail, Instant completedAt) {
        Long id = jdbc.queryForObject("""
                INSERT INTO billing_pos_sale (
                    sale_key, idempotency_key, request_hash, sale_status,
                    customer_name, customer_mobile, customer_email,
                    subtotal_amount, promotion_discount_amount, manual_discount_amount,
                    payable_amount, created_by_user_id, created_by_email_snapshot, completed_at,
                    confirmed_quote_fingerprint
                ) VALUES (?, ?, ?, 'COMPLETED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING id
                """, Long.class,
                saleKey, idempotencyKey, requestHash,
                clean(quoteRequest.customerName()), clean(quoteRequest.customerMobile()), clean(quoteRequest.customerEmail()),
                quote.subtotal(), quote.totalPromotionDiscount(), quote.manualDiscount(), quote.payableAmount(),
                adminId, adminEmail, Timestamp.from(completedAt), confirmedQuoteFingerprint);
        if (id == null) throw new IllegalStateException("The POS sale could not be persisted.");
        return id;
    }

    public long insertLine(long saleId, PosQuoteResponse.Line line) {
        Long id = jdbc.queryForObject("""
                INSERT INTO billing_pos_sale_line (
                    sale_id, product_id, variant_id, product_name_snapshot, variant_size_snapshot,
                    quantity, unit_price_snapshot, bottle_id, bottle_name_snapshot, bottle_price_snapshot,
                    promotion_discount_amount, manual_discount_amount, line_total_amount,
                    line_key, is_free_item, free_promotion_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING id
                """, Long.class,
                saleId, line.productId(), line.variantId(), line.productName(), line.variantSize(),
                line.quantity(), line.variantUnitPrice(), line.bottleId(), line.bottleName(),
                line.bottleUnitPrice(), line.promotionDiscount(), line.manualDiscount(), line.finalLineTotal(),
                line.lineKey(), line.freeItem(), line.freePromotionId());
        if (id == null) throw new IllegalStateException("The POS sale line could not be persisted.");
        return id;
    }

    public void insertDiscountApplication(long saleId, Long saleLineId,
                                          PosQuoteResponse.ManualDiscountPreview discount, long adminId) {
        jdbc.update("""
                INSERT INTO billing_discount_application (
                    sale_id, sale_line_id, scope, discount_type, requested_value,
                    applied_amount, calculation_base, staff_user_id, reason,
                    approver_user_id, policy_version, approved_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL)
                """, saleId, saleLineId, discount.scope().name(), discount.type().name(),
                discount.requestedValue(), discount.appliedAmount(), discount.eligibleBalance(),
                adminId, discount.reason());
    }

    public void insertPromotion(long saleId, PosQuoteResponse.PromotionSummary promotion) {
        jdbc.update("""
                INSERT INTO billing_pos_sale_promotion (
                    sale_id, promotion_id, promotion_name_snapshot,
                    promotion_code_snapshot, promotion_type_snapshot
                ) VALUES (?, ?, ?, ?, ?)
                """, saleId, promotion.id(), promotion.name(), promotion.code(), promotion.type().name());
    }

    public void insertTender(long saleId, TenderMethod method, BigDecimal payable,
                             BigDecimal received, BigDecimal change, BigDecimal applied,
                             String reference, long adminId) {
        jdbc.update("""
                INSERT INTO billing_pos_tender (
                    sale_id, tender_method, sale_payable_amount, amount_received,
                    change_returned, amount_applied, transaction_reference, recorded_by_user_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, saleId, method.name(), payable, received, change, applied, clean(reference), adminId);
    }

    public Optional<ExistingSale> findByIdempotencyKey(String key) {
        return jdbc.query("""
                SELECT s.id AS sale_id, s.sale_key, s.request_hash, s.created_by_user_id, s.sale_status,
                       s.confirmed_quote_fingerprint,
                       s.subtotal_amount, s.promotion_discount_amount, s.manual_discount_amount,
                       s.payable_amount, t.tender_method, t.amount_received, t.change_returned,
                       t.amount_applied, i.id AS invoice_id, i.invoice_number, i.issued_at
                FROM billing_pos_sale s
                LEFT JOIN billing_pos_tender t ON t.sale_id = s.id
                LEFT JOIN billing_invoice i ON i.source_type = 'POS_SALE' AND i.source_id = s.id
                WHERE s.idempotency_key = ?
                """, rs -> {
            if (!rs.next()) return Optional.empty();
            String rawHash = rs.getString("request_hash");
            Timestamp issued = rs.getTimestamp("issued_at");
            long invoiceId = rs.getLong("invoice_id");
            boolean hasInvoice = !rs.wasNull();
            String tenderName = rs.getString("tender_method");
            PosSaleFinalizeResponse response = new PosSaleFinalizeResponse(
                    rs.getLong("sale_id"), UUID.fromString(rs.getString("sale_key")),
                    rs.getString("sale_status"), hasInvoice ? invoiceId : 0L,
                    rs.getString("invoice_number"), issued == null ? null : issued.toInstant(),
                    rs.getString("confirmed_quote_fingerprint"),
                    rs.getBigDecimal("subtotal_amount"), rs.getBigDecimal("promotion_discount_amount"),
                    rs.getBigDecimal("manual_discount_amount"), rs.getBigDecimal("payable_amount"),
                    tenderName == null ? null : TenderMethod.valueOf(tenderName), rs.getBigDecimal("amount_received"),
                    rs.getBigDecimal("change_returned"), rs.getBigDecimal("amount_applied"), true);
            return Optional.of(new ExistingSale(rawHash == null ? null : rawHash.trim(),
                    rs.getLong("created_by_user_id"), response));
        }, key);
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public record ExistingSale(String requestHash, long adminId, PosSaleFinalizeResponse response) {
    }
}
