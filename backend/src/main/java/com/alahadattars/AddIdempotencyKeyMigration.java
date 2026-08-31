package com.alahadattars;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class AddIdempotencyKeyMigration implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public AddIdempotencyKeyMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        try {
            jdbcTemplate.execute("ALTER TABLE bulk_price_audit ADD COLUMN idempotency_key VARCHAR(100) UNIQUE;");
            System.out.println("Successfully added idempotency_key to bulk_price_audit table");
        } catch (Exception e) {
            System.out.println("Migration skipped or failed (might already exist): " + e.getMessage());
        }
    }
}
