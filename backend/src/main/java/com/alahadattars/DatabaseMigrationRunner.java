package com.alahadattars;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseMigrationRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseMigrationRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        try {
            jdbcTemplate.execute("ALTER TABLE bulk_price_audit DROP CONSTRAINT IF EXISTS bulk_price_audit_operation_check");
            jdbcTemplate.execute("ALTER TABLE bulk_price_audit DROP CONSTRAINT IF EXISTS bulk_price_audit_type_check");
            jdbcTemplate.execute("ALTER TABLE bulk_price_audit DROP CONSTRAINT IF EXISTS bulk_price_audit_scope_check");
            jdbcTemplate.execute("ALTER TABLE bulk_price_audit DROP CONSTRAINT IF EXISTS bulk_price_audit_status_check");
        } catch (Exception e) {
            // Ignore if constraints don't exist
        }
    }
}
