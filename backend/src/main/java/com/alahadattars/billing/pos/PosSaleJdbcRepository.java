package com.alahadattars.billing.pos;

import com.alahadattars.billing.sale.TenderMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
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
        BigDecimal packagingPrice = line.bottleUnitPrice().add(line.giftBoxCharge() != null ? line.giftBoxCharge() : BigDecimal.ZERO);
        String packagingName = line.bottleName();
        if (line.giftBoxCharge() != null && line.giftBoxCharge().signum() > 0) {
            packagingName = packagingName != null ? packagingName + " + Gift Box" : "Gift Box";
        }
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
                line.quantity(), line.variantUnitPrice(), line.bottleId(), packagingName,
                packagingPrice, line.promotionDiscount(), line.manualDiscount(), line.finalLineTotal(),
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

    public Optional<PosSaleDetailResponse> findSaleDetailById(long saleId) {
        return jdbc.query("""
                SELECT s.id AS sale_id, s.sale_key, s.idempotency_key, s.sale_status,
                       s.created_by_email_snapshot, s.created_at, s.completed_at,
                       s.customer_name, s.customer_mobile, s.customer_email,
                       s.subtotal_amount, s.promotion_discount_amount, s.manual_discount_amount,
                       s.payable_amount, s.confirmed_quote_fingerprint,
                       t.tender_method, t.amount_received, t.change_returned, t.amount_applied,
                       t.transaction_reference, t.recorded_at,
                       i.id AS invoice_id, i.invoice_number, i.invoice_status, i.issued_at
                FROM billing_pos_sale s
                LEFT JOIN billing_pos_tender t ON t.sale_id = s.id
                LEFT JOIN billing_invoice i ON i.source_type = 'POS_SALE' AND i.source_id = s.id
                WHERE s.id = ?
                """, rs -> {
            if (!rs.next()) return Optional.empty();

            long id = rs.getLong("sale_id");
            UUID key = UUID.fromString(rs.getString("sale_key"));
            String idempotency = rs.getString("idempotency_key");
            String status = rs.getString("sale_status");
            String adminEmail = rs.getString("created_by_email_snapshot");
            Timestamp createdTs = rs.getTimestamp("created_at");
            Instant created = createdTs == null ? null : createdTs.toInstant();
            Timestamp completedTs = rs.getTimestamp("completed_at");
            Instant completed = completedTs == null ? null : completedTs.toInstant();
            String cName = rs.getString("customer_name");
            String cMobile = rs.getString("customer_mobile");
            String cEmail = rs.getString("customer_email");
            BigDecimal subtotal = rs.getBigDecimal("subtotal_amount");
            BigDecimal promoDiscount = rs.getBigDecimal("promotion_discount_amount");
            BigDecimal manualDiscount = rs.getBigDecimal("manual_discount_amount");
            BigDecimal payable = rs.getBigDecimal("payable_amount");
            String fingerprint = rs.getString("confirmed_quote_fingerprint");

            // Tender
            String tenderMethod = rs.getString("tender_method");
            BigDecimal received = rs.getBigDecimal("amount_received");
            BigDecimal change = rs.getBigDecimal("change_returned");
            BigDecimal applied = rs.getBigDecimal("amount_applied");
            String txRef = rs.getString("transaction_reference");
            Timestamp recTs = rs.getTimestamp("recorded_at");
            Instant recorded = recTs == null ? null : recTs.toInstant();
            PosSaleDetailResponse.TenderDetail tender = tenderMethod == null ? null :
                    new PosSaleDetailResponse.TenderDetail(tenderMethod, payable, received, change, applied, txRef, recorded);

            // Invoice
            long invId = rs.getLong("invoice_id");
            boolean hasInv = !rs.wasNull();
            String invNumber = rs.getString("invoice_number");
            String invStatus = rs.getString("invoice_status");
            Timestamp issuedTs = rs.getTimestamp("issued_at");
            Instant issued = issuedTs == null ? null : issuedTs.toInstant();
            PosSaleDetailResponse.InvoiceDetail invoice = hasInv ?
                    new PosSaleDetailResponse.InvoiceDetail(invId, invNumber, invStatus, issued) : null;

            // Lines
            List<PosSaleDetailResponse.LineDetail> lines = jdbc.query("""
                    SELECT id, line_key, product_id, variant_id, product_name_snapshot,
                           variant_size_snapshot, quantity, unit_price_snapshot, bottle_id,
                           bottle_name_snapshot, bottle_price_snapshot, promotion_discount_amount,
                           manual_discount_amount, line_total_amount, is_free_item, free_promotion_id
                    FROM billing_pos_sale_line
                    WHERE sale_id = ?
                    ORDER BY id ASC
                    """, (lrs, rowNum) -> new PosSaleDetailResponse.LineDetail(
                    lrs.getLong("id"),
                    lrs.getString("line_key"),
                    (Long) lrs.getObject("product_id"),
                    (Long) lrs.getObject("variant_id"),
                    lrs.getString("product_name_snapshot"),
                    lrs.getString("variant_size_snapshot"),
                    lrs.getInt("quantity"),
                    lrs.getBigDecimal("unit_price_snapshot"),
                    (Long) lrs.getObject("bottle_id"),
                    lrs.getString("bottle_name_snapshot"),
                    lrs.getBigDecimal("bottle_price_snapshot"),
                    lrs.getBigDecimal("promotion_discount_amount"),
                    lrs.getBigDecimal("manual_discount_amount"),
                    lrs.getBigDecimal("line_total_amount"),
                    lrs.getBoolean("is_free_item"),
                    (Long) lrs.getObject("free_promotion_id")
            ), id);

            // Promotions
            List<PosSaleDetailResponse.PromotionDetail> promotions = jdbc.query("""
                    SELECT promotion_id, promotion_name_snapshot, promotion_code_snapshot, promotion_type_snapshot
                    FROM billing_pos_sale_promotion
                    WHERE sale_id = ?
                    ORDER BY id ASC
                    """, (prs, rowNum) -> new PosSaleDetailResponse.PromotionDetail(
                    prs.getLong("promotion_id"),
                    prs.getString("promotion_name_snapshot"),
                    prs.getString("promotion_code_snapshot"),
                    prs.getString("promotion_type_snapshot")
            ), id);

            // Discounts
            List<PosSaleDetailResponse.DiscountDetail> discounts = jdbc.query("""
                    SELECT scope, discount_type, requested_value, applied_amount, reason
                    FROM billing_discount_application
                    WHERE sale_id = ?
                    ORDER BY id ASC
                    """, (drs, rowNum) -> new PosSaleDetailResponse.DiscountDetail(
                    drs.getString("scope"),
                    drs.getString("discount_type"),
                    drs.getBigDecimal("requested_value"),
                    drs.getBigDecimal("applied_amount"),
                    drs.getString("reason")
            ), id);

            // Timeline
            List<PosSaleDetailResponse.TimelineDetail> timeline = new ArrayList<>();
            timeline.add(new PosSaleDetailResponse.TimelineDetail(
                    "INITIATED", "Sale Draft Created", created, "COMPLETED",
                    "POS sale initiated" + (adminEmail != null ? " by " + adminEmail : ""), false));
            if (fingerprint != null) {
                timeline.add(new PosSaleDetailResponse.TimelineDetail(
                        "QUOTED", "Server Quote Confirmed", created, "COMPLETED",
                        "Authoritative price and discount calculations verified (Fingerprint: "
                                + fingerprint.substring(0, Math.min(12, fingerprint.length())) + "…)", true));
            }
            timeline.add(new PosSaleDetailResponse.TimelineDetail(
                    "INVENTORY_DEDUCTED", "Inventory Deducted", completed != null ? completed : created, "COMPLETED",
                    "Stock deducted atomically in transaction for " + lines.size() + " line item(s)", true));
            if (tender != null) {
                timeline.add(new PosSaleDetailResponse.TimelineDetail(
                        "TENDER_RECORDED", "Payment Recorded", recorded != null ? recorded : completed, "COMPLETED",
                        tender.tenderMethod() + " tender processed. Payable: ₹" + payable + ", Received: ₹" + received
                                + (change != null && change.compareTo(BigDecimal.ZERO) > 0 ? ", Change: ₹" + change : "")
                                + (txRef != null && !txRef.isBlank() ? " [Ref: " + txRef + "]" : ""), false));
            }
            if (invoice != null) {
                timeline.add(new PosSaleDetailResponse.TimelineDetail(
                        "INVOICE_GENERATED", "Invoice Issued", issued != null ? issued : completed, "COMPLETED",
                        "Immutable legal invoice " + invoice.invoiceNumber() + " generated", false));
            }
            timeline.add(new PosSaleDetailResponse.TimelineDetail(
                    "COMPLETED", "Sale Finalized", completed != null ? completed : created, status,
                    "Transaction successfully finalized and committed to database", false));

            return Optional.of(new PosSaleDetailResponse(
                    id, key, idempotency, status, adminEmail, created, completed,
                    cName, cMobile, cEmail, subtotal, promoDiscount, manualDiscount,
                    payable, fingerprint, tender, invoice, lines, promotions, discounts, timeline
            ));
        }, saleId);
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public record ExistingSale(String requestHash, long adminId, PosSaleFinalizeResponse response) {
    }
}
