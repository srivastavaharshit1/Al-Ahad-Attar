package com.alahadattars.migration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class VariantPriceMigrationRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(VariantPriceMigrationRunner.class);
    private final JdbcTemplate jdbcTemplate;

    public VariantPriceMigrationRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        log.info("Checking for product_variant.actual_price to migrate to price...");
        try {
            // Check if actual_price exists
            Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM information_schema.columns WHERE table_name='product_variant' AND column_name='actual_price'",
                Integer.class
            );

            if (count != null && count > 0) {
                log.info("Migrating actual_price data to price...");
                // Migrate the data
                int updated = jdbcTemplate.update("UPDATE product_variant SET price = actual_price WHERE actual_price IS NOT NULL");
                log.info("Migrated {} rows in product_variant.", updated);

                // Drop the old column to clean up the schema
                jdbcTemplate.execute("ALTER TABLE product_variant DROP COLUMN actual_price");
                log.info("Dropped legacy actual_price column.");
            } else {
                log.info("No actual_price column found (migration already ran).");
            }
        } catch (Exception e) {
            log.warn("Variant price migration encountered an error (can be ignored if already migrated): {}", e.getMessage());
        }
    }
}
