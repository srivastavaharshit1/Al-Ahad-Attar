package com.alahadattars.billing.reporting;

import com.alahadattars.billing.invoice.InvoiceChannel;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Repository
public class BillingReportingRepository {
    private final JdbcTemplate jdbc;

    public BillingReportingRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public BillingPage<InvoiceHistoryRecord> invoiceHistory(String search, InvoiceChannel channel, String paymentMethod,
                                                             LocalDate from, LocalDate to, int limit, int offset) {
        StringBuilder where = new StringBuilder(" WHERE 1 = 1 ");
        List<Object> parameters = new ArrayList<>();
        if (channel != null) { where.append(" AND i.invoice_channel = ? "); parameters.add(channel.name()); }
        if (paymentMethod != null && !paymentMethod.isBlank()) {
            where.append(" AND COALESCE(t.tender_method, 'ONLINE') = ? "); parameters.add(paymentMethod.toUpperCase());
        }
        addDateFilters(where, parameters, "i.issued_at", from, to);
        if (search != null && !search.isBlank()) {
            where.append(" AND (LOWER(i.invoice_number) LIKE ? OR LOWER(COALESCE(i.customer_name_snapshot, '')) LIKE ? "
                    + "OR LOWER(COALESCE(i.customer_mobile_snapshot, '')) LIKE ? OR LOWER(COALESCE(i.customer_email_snapshot, '')) LIKE ? "
                    + "OR LOWER(COALESCE(o.order_number, '')) LIKE ? OR LOWER(CAST(i.source_id AS VARCHAR)) LIKE ? "
                    + "OR LOWER(COALESCE(CAST(s.sale_key AS VARCHAR), '')) LIKE ?)");
            String pattern = "%" + search.trim().toLowerCase() + "%";
            for (int i = 0; i < 7; i++) parameters.add(pattern);
        }
        String joins = " FROM billing_invoice i "
                + "LEFT JOIN orders o ON i.source_type = 'ONLINE_ORDER' AND o.id = i.source_id "
                + "LEFT JOIN billing_pos_sale s ON i.source_type = 'POS_SALE' AND s.id = i.source_id "
                + "LEFT JOIN billing_pos_tender t ON t.sale_id = s.id ";
        Long count = jdbc.queryForObject("SELECT COUNT(*)" + joins + where, Long.class, parameters.toArray());
        String sql = """
                SELECT i.id, i.invoice_key, i.invoice_number, i.invoice_channel, i.customer_name_snapshot,
                       i.customer_mobile_snapshot, i.customer_email_snapshot,
                       CASE WHEN i.source_type = 'POS_SALE' THEN s.id ELSE NULL END AS sale_id,
                       s.sale_key, o.order_number, i.total_amount, i.promotion_discount_amount,
                       i.manual_discount_amount, COALESCE(t.tender_method, 'ONLINE') AS tender_method,
                       (SELECT d.status FROM billing_invoice_delivery d WHERE d.invoice_id = i.id AND d.channel = 'EMAIL'
                        ORDER BY d.created_at DESC, d.id DESC LIMIT 1) AS email_status,
                       COALESCE((SELECT d.attempt_count FROM billing_invoice_delivery d WHERE d.invoice_id = i.id AND d.channel = 'EMAIL'
                        ORDER BY d.created_at DESC, d.id DESC LIMIT 1), 0) AS email_attempts,
                       (SELECT d.status FROM billing_invoice_delivery d WHERE d.invoice_id = i.id AND d.channel = 'WHATSAPP'
                        ORDER BY d.created_at DESC, d.id DESC LIMIT 1) AS whatsapp_status,
                       COALESCE((SELECT d.attempt_count FROM billing_invoice_delivery d WHERE d.invoice_id = i.id AND d.channel = 'WHATSAPP'
                        ORDER BY d.created_at DESC, d.id DESC LIMIT 1), 0) AS whatsapp_attempts,
                       i.issued_at
                """ + joins + where + " ORDER BY i.issued_at DESC, i.id DESC LIMIT ? OFFSET ?";
        parameters.add(limit);
        parameters.add(offset);
        List<InvoiceHistoryRecord> rows = jdbc.query(sql, (rs, rowNum) -> new InvoiceHistoryRecord(
                rs.getLong("id"), UUID.fromString(rs.getString("invoice_key")), rs.getString("invoice_number"),
                InvoiceChannel.valueOf(rs.getString("invoice_channel")), rs.getString("customer_name_snapshot"),
                rs.getString("customer_mobile_snapshot"), rs.getString("customer_email_snapshot"),
                rs.getObject("sale_id") == null ? null : rs.getLong("sale_id"),
                rs.getString("sale_key") == null ? null : UUID.fromString(rs.getString("sale_key")),
                rs.getString("order_number"), rs.getBigDecimal("total_amount"),
                rs.getBigDecimal("promotion_discount_amount"), rs.getBigDecimal("manual_discount_amount"),
                rs.getString("tender_method"), rs.getString("email_status"), rs.getInt("email_attempts"),
                rs.getString("whatsapp_status"), rs.getInt("whatsapp_attempts"), rs.getTimestamp("issued_at").toInstant()),
                parameters.toArray());
        return new BillingPage<>(rows, count == null ? 0 : count, limit, offset);
    }

    public BillingPage<PosSaleHistoryRecord> posSales(String search, String tenderMethod, LocalDate from,
                                                       LocalDate to, int limit, int offset) {
        StringBuilder where = new StringBuilder(" WHERE s.sale_status = 'COMPLETED' ");
        List<Object> parameters = new ArrayList<>();
        if (tenderMethod != null && !tenderMethod.isBlank()) {
            where.append(" AND t.tender_method = ? "); parameters.add(tenderMethod.toUpperCase());
        }
        addDateFilters(where, parameters, "s.completed_at", from, to);
        if (search != null && !search.isBlank()) {
            where.append(" AND (LOWER(CAST(s.id AS VARCHAR)) LIKE ? OR LOWER(CAST(s.sale_key AS VARCHAR)) LIKE ? "
                    + "OR LOWER(COALESCE(i.invoice_number, '')) LIKE ? OR LOWER(COALESCE(s.customer_name, '')) LIKE ? "
                    + "OR LOWER(COALESCE(s.customer_mobile, '')) LIKE ? OR LOWER(COALESCE(s.customer_email, '')) LIKE ?)");
            String pattern = "%" + search.trim().toLowerCase() + "%";
            for (int i = 0; i < 6; i++) parameters.add(pattern);
        }
        String joins = " FROM billing_pos_sale s JOIN billing_pos_tender t ON t.sale_id = s.id "
                + "LEFT JOIN billing_invoice i ON i.source_type = 'POS_SALE' AND i.source_id = s.id ";
        Long count = jdbc.queryForObject("SELECT COUNT(*)" + joins + where, Long.class, parameters.toArray());
        String sql = """
                SELECT s.id AS sale_id, s.sale_key, i.invoice_number, s.customer_name, s.customer_mobile,
                       s.customer_email, s.subtotal_amount, s.promotion_discount_amount,
                       s.manual_discount_amount, s.payable_amount, t.tender_method, t.amount_received,
                       t.change_returned, s.completed_at
                """ + joins + where + " ORDER BY s.completed_at DESC, s.id DESC LIMIT ? OFFSET ?";
        parameters.add(limit);
        parameters.add(offset);
        List<PosSaleHistoryRecord> rows = jdbc.query(sql, (rs, rowNum) -> new PosSaleHistoryRecord(
                rs.getLong("sale_id"), UUID.fromString(rs.getString("sale_key")), rs.getString("invoice_number"),
                rs.getString("customer_name"), rs.getString("customer_mobile"), rs.getString("customer_email"),
                rs.getBigDecimal("subtotal_amount"), rs.getBigDecimal("promotion_discount_amount"),
                rs.getBigDecimal("manual_discount_amount"), rs.getBigDecimal("payable_amount"),
                rs.getString("tender_method"), rs.getBigDecimal("amount_received"),
                rs.getBigDecimal("change_returned"), rs.getTimestamp("completed_at").toInstant()), parameters.toArray());
        return new BillingPage<>(rows, count == null ? 0 : count, limit, offset);
    }

    public BillingSalesSummary summary(LocalDate from, LocalDate to) {
        List<Object> bounds = bounds(from, to);
        List<ChannelTotal> totals = jdbc.query("""
                WITH sales AS (
                    SELECT 'ONLINE' AS channel, 'ONLINE' AS method, o.total_amount AS amount,
                           COALESCE(o.offer_discount_amount, 0) + COALESCE(o.coupon_discount_amount, 0) AS discounts,
                           o.created_at AS sold_at
                    FROM orders o
                    WHERE o.payment_status = 'PAID' AND o.payment_method = 'ONLINE'
                      AND o.status <> 'CANCELLED' AND o.refund_status = 'NOT_REQUIRED'
                    UNION ALL
                    SELECT 'POS' AS channel, t.tender_method AS method, s.payable_amount AS amount,
                           s.promotion_discount_amount + s.manual_discount_amount AS discounts,
                           s.completed_at AS sold_at
                    FROM billing_pos_sale s JOIN billing_pos_tender t ON t.sale_id = s.id
                    WHERE s.sale_status = 'COMPLETED'
                )
                SELECT channel, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS sales,
                       COALESCE(SUM(discounts), 0) AS discounts
                FROM sales WHERE sold_at >= ? AND sold_at < ? GROUP BY channel
                """, (rs, rowNum) -> new ChannelTotal(rs.getString("channel"), rs.getLong("count"),
                rs.getBigDecimal("sales"), rs.getBigDecimal("discounts")), bounds.toArray());
        List<BillingSalesSummary.PaymentBreakdown> methods = jdbc.query("""
                WITH sales AS (
                    SELECT 'ONLINE' AS method, o.total_amount AS amount,
                           COALESCE(o.offer_discount_amount, 0) + COALESCE(o.coupon_discount_amount, 0) AS discounts,
                           o.created_at AS sold_at
                    FROM orders o
                    WHERE o.payment_status = 'PAID' AND o.payment_method = 'ONLINE'
                      AND o.status <> 'CANCELLED' AND o.refund_status = 'NOT_REQUIRED'
                    UNION ALL
                    SELECT t.tender_method AS method, s.payable_amount AS amount,
                           s.promotion_discount_amount + s.manual_discount_amount AS discounts,
                           s.completed_at AS sold_at
                    FROM billing_pos_sale s JOIN billing_pos_tender t ON t.sale_id = s.id
                    WHERE s.sale_status = 'COMPLETED'
                )
                SELECT method, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS sales,
                       COALESCE(SUM(discounts), 0) AS discounts
                FROM sales WHERE sold_at >= ? AND sold_at < ? GROUP BY method ORDER BY method
                """, (rs, rowNum) -> new BillingSalesSummary.PaymentBreakdown(rs.getString("method"),
                rs.getLong("count"), rs.getBigDecimal("sales"), rs.getBigDecimal("discounts")), bounds.toArray());
        List<BillingSalesSummary.SalesBucket> daily = bucket(from, to, true);
        List<BillingSalesSummary.SalesBucket> monthly = bucket(from, to, false);
        ChannelTotal online = totals.stream().filter(t -> "ONLINE".equals(t.channel())).findFirst().orElse(ChannelTotal.ZERO_ONLINE);
        ChannelTotal pos = totals.stream().filter(t -> "POS".equals(t.channel())).findFirst().orElse(ChannelTotal.ZERO_POS);
        return new BillingSalesSummary(from, to, online.count(), online.sales(), online.discounts(),
                pos.count(), pos.sales(), pos.discounts(), online.count() + pos.count(),
                online.sales().add(pos.sales()), online.discounts().add(pos.discounts()), methods, daily, monthly);
    }

    private List<BillingSalesSummary.SalesBucket> bucket(LocalDate from, LocalDate to, boolean daily) {
        String period = daily
                ? "CAST(sold_at AT TIME ZONE 'UTC' AS DATE)::varchar"
                : "TO_CHAR(sold_at AT TIME ZONE 'UTC', 'YYYY-MM')";
        return jdbc.query("""
                WITH sales AS (
                    SELECT o.total_amount AS amount, COALESCE(o.offer_discount_amount, 0) + COALESCE(o.coupon_discount_amount, 0) AS discounts,
                           o.created_at AS sold_at FROM orders o
                    WHERE o.payment_status = 'PAID' AND o.payment_method = 'ONLINE'
                      AND o.status <> 'CANCELLED' AND o.refund_status = 'NOT_REQUIRED'
                    UNION ALL
                    SELECT s.payable_amount AS amount, s.promotion_discount_amount + s.manual_discount_amount AS discounts,
                           s.completed_at AS sold_at FROM billing_pos_sale s
                    WHERE s.sale_status = 'COMPLETED'
                )
                SELECT
                """ + period + " AS period, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS sales, "
                + "COALESCE(SUM(discounts), 0) AS discounts FROM sales WHERE sold_at >= ? AND sold_at < ? "
                + "GROUP BY period ORDER BY period", (rs, rowNum) -> new BillingSalesSummary.SalesBucket(
                rs.getString("period"), rs.getLong("count"), rs.getBigDecimal("sales"), rs.getBigDecimal("discounts")),
                bounds(from, to).toArray());
    }

    private static void addDateFilters(StringBuilder where, List<Object> parameters, String column,
                                       LocalDate from, LocalDate to) {
        if (from != null) { where.append(" AND ").append(column).append(" >= ? "); parameters.add(Timestamp.from(from.atStartOfDay(ZoneOffset.UTC).toInstant())); }
        if (to != null) { where.append(" AND ").append(column).append(" < ? "); parameters.add(Timestamp.from(to.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant())); }
    }

    private static List<Object> bounds(LocalDate from, LocalDate to) {
        LocalDate start = from == null ? LocalDate.of(1970, 1, 1) : from;
        LocalDate end = to == null ? LocalDate.of(9999, 12, 31) : to.plusDays(1);
        return List.of(Timestamp.from(start.atStartOfDay(ZoneOffset.UTC).toInstant()),
                Timestamp.from(end.atStartOfDay(ZoneOffset.UTC).toInstant()));
    }

    private record ChannelTotal(String channel, long count, java.math.BigDecimal sales, java.math.BigDecimal discounts) {
        private static final ChannelTotal ZERO_ONLINE = new ChannelTotal("ONLINE", 0, java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO);
        private static final ChannelTotal ZERO_POS = new ChannelTotal("POS", 0, java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO);
    }
}
