package com.alahadattars.billing.invoice;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementCreator;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Repository
public class InvoiceJdbcRepository {
    private final JdbcTemplate jdbcTemplate;

    public InvoiceJdbcRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public long store(InvoiceSnapshot invoice, String financialYear, Map<InvoicePaperFormat, byte[]> pdfs) {
        if (pdfs == null || !pdfs.containsKey(InvoicePaperFormat.A4) || !pdfs.containsKey(InvoicePaperFormat.THERMAL_80)) {
            throw new IllegalArgumentException("Both A4 and 80mm invoice PDFs are required");
        }
        long invoiceId = insertInvoice(invoice, financialYear);
        for (InvoiceLineSnapshot line : invoice.lines()) {
            jdbcTemplate.update("""
                    INSERT INTO billing_invoice_line (
                        invoice_id, line_number, product_id, variant_id, product_name_snapshot,
                        variant_size_snapshot, quantity, unit_price_snapshot, bottle_id,
                        bottle_name_snapshot, bottle_price_snapshot, promotion_discount_amount,
                        manual_discount_amount, line_total_amount, is_free_item, free_promotion_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, invoiceId, line.lineNumber(), line.productId(), line.variantId(), line.productName(),
                    line.variantSize(), line.quantity(), line.unitPrice(), line.bottleId(), line.bottleName(),
                    line.bottlePrice(), line.promotionDiscount(), line.manualDiscount(), line.lineTotal(),
                    line.freeItem(), line.freePromotionId());
        }
        for (Map.Entry<InvoicePaperFormat, byte[]> pdf : pdfs.entrySet()) {
            jdbcTemplate.update("""
                    INSERT INTO billing_invoice_pdf (invoice_id, paper_format, sha256, pdf_data)
                    VALUES (?, ?, ?, ?)
                    """, invoiceId, pdf.getKey().name(), sha256(pdf.getValue()), pdf.getValue());
        }
        return invoiceId;
    }

    public Optional<InvoicePdfDocument> findPdf(long invoiceId, InvoicePaperFormat format) {
        List<InvoicePdfDocument> documents = jdbcTemplate.query("""
                SELECT invoice_id, paper_format, sha256, pdf_data
                FROM billing_invoice_pdf WHERE invoice_id = ? AND paper_format = ?
                """, (rs, rowNum) -> new InvoicePdfDocument(
                rs.getLong("invoice_id"), InvoicePaperFormat.valueOf(rs.getString("paper_format")),
                rs.getString("sha256"), rs.getBytes("pdf_data")), invoiceId, format.name());
        return documents.stream().findFirst();
    }

    public List<InvoiceListItem> findHistory(InvoiceChannel channel, int limit, int offset) {
        String sql = channel == null ? """
                SELECT id, invoice_key, invoice_number, invoice_channel, customer_name_snapshot,
                       total_amount, issued_at
                FROM billing_invoice ORDER BY issued_at DESC, id DESC LIMIT ? OFFSET ?
                """ : """
                SELECT id, invoice_key, invoice_number, invoice_channel, customer_name_snapshot,
                       total_amount, issued_at
                FROM billing_invoice WHERE invoice_channel = ?
                ORDER BY issued_at DESC, id DESC LIMIT ? OFFSET ?
                """;
        if (channel == null) {
            return jdbcTemplate.query(sql, (rs, rowNum) -> mapListItem(rs), limit, offset);
        }
        return jdbcTemplate.query(sql, (rs, rowNum) -> mapListItem(rs), channel.name(), limit, offset);
    }

    public Optional<InvoiceListItem> findHistoryItem(long invoiceId) {
        List<InvoiceListItem> items = jdbcTemplate.query("""
                SELECT id, invoice_key, invoice_number, invoice_channel, customer_name_snapshot,
                       total_amount, issued_at
                FROM billing_invoice WHERE id = ?
                """, (rs, rowNum) -> mapListItem(rs), invoiceId);
        return items.stream().findFirst();
    }

    private long insertInvoice(InvoiceSnapshot invoice, String financialYear) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        PreparedStatementCreator creator = connection -> prepareInvoiceStatement(connection, invoice, financialYear);
        jdbcTemplate.update(creator, keyHolder);
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Database did not return the new invoice id");
        }
        return key.longValue();
    }

    private static PreparedStatement prepareInvoiceStatement(Connection connection, InvoiceSnapshot invoice, String financialYear)
            throws SQLException {
        PreparedStatement statement = connection.prepareStatement("""
                INSERT INTO billing_invoice (
                    invoice_key, invoice_number, invoice_channel, source_type, source_id,
                    financial_year, invoice_status, seller_name_snapshot, seller_address_snapshot,
                    seller_phone_snapshot, seller_email_snapshot, customer_name_snapshot,
                    customer_mobile_snapshot, customer_email_snapshot, subtotal_amount,
                    promotion_discount_amount, manual_discount_amount, total_amount, gst_status,
                    gstin_snapshot, gst_enabled, tax_mode, invoice_notice_snapshot, issued_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'FINAL', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, new String[]{"id"});
        statement.setObject(1, invoice.invoiceKey());
        statement.setString(2, invoice.invoiceNumber());
        statement.setString(3, invoice.channel().name());
        statement.setString(4, invoice.sourceType().name());
        statement.setLong(5, invoice.sourceId());
        statement.setString(6, financialYear);
        statement.setString(7, invoice.seller().name());
        statement.setString(8, invoice.seller().address());
        statement.setString(9, invoice.seller().phone());
        statement.setString(10, invoice.seller().email());
        statement.setString(11, invoice.customer() == null ? null : invoice.customer().name());
        statement.setString(12, invoice.customer() == null ? null : invoice.customer().mobile());
        statement.setString(13, invoice.customer() == null ? null : invoice.customer().email());
        statement.setBigDecimal(14, invoice.subtotal());
        statement.setBigDecimal(15, invoice.promotionDiscount());
        statement.setBigDecimal(16, invoice.manualDiscount());
        statement.setBigDecimal(17, invoice.total());
        statement.setString(18, invoice.tax().status().name());
        statement.setString(19, invoice.tax().gstin());
        statement.setBoolean(20, invoice.tax().gstEnabled());
        statement.setString(21, invoice.tax().mode().name());
        statement.setString(22, invoice.invoiceNoticeSnapshot());
        statement.setTimestamp(23, Timestamp.from(invoice.issuedAt()));
        return statement;
    }

    private static InvoiceListItem mapListItem(java.sql.ResultSet rs) throws SQLException {
        return new InvoiceListItem(
                rs.getLong("id"), UUID.fromString(rs.getString("invoice_key")),
                rs.getString("invoice_number"), InvoiceChannel.valueOf(rs.getString("invoice_channel")),
                rs.getString("customer_name_snapshot"), rs.getBigDecimal("total_amount"),
                rs.getTimestamp("issued_at").toInstant());
    }

    private static String sha256(byte[] data) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
