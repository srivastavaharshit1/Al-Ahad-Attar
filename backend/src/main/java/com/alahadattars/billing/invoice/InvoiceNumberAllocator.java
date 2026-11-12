package com.alahadattars.billing.invoice;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InvoiceNumberAllocator {
    private final JdbcTemplate jdbcTemplate;

    public InvoiceNumberAllocator(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Atomically increments a channel/year sequence. Formatting and financial-year rules remain configurable business decisions. */
    @Transactional
    public InvoiceNumberValue next(InvoiceChannel channel, String financialYear) {
        if (channel == null || financialYear == null || financialYear.isBlank()) {
            throw new IllegalArgumentException("invoice channel and financial year are required");
        }
        jdbcTemplate.update("""
                INSERT INTO billing_invoice_number_counter (invoice_channel, financial_year, last_value)
                VALUES (?, ?, 0)
                ON CONFLICT (invoice_channel, financial_year) DO NOTHING
                """, channel.name(), financialYear);
        Long value = jdbcTemplate.queryForObject("""
                UPDATE billing_invoice_number_counter
                SET last_value = last_value + 1
                WHERE invoice_channel = ? AND financial_year = ?
                RETURNING last_value
                """, Long.class, channel.name(), financialYear);
        if (value == null) {
            throw new IllegalStateException("Invoice sequence could not be allocated");
        }
        return new InvoiceNumberValue(channel, financialYear, value);
    }
}
