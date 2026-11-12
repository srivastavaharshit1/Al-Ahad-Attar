package com.alahadattars.migration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;

public class DedicatedFlywayMigrationRunnerTest {

    private static final String STAGING_URL = "jdbc:postgresql://aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require";
    private static final String STAGING_USER = "postgres.snscwrceodnjjoxpczar";
    private static final String STAGING_PASS = "Admin@as#9506";

    @Test
    @DisplayName("Verify DedicatedFlywayMigrationRunner against disposable PostgreSQL 17.6 database")
    void testDedicatedFlywayMigrationRunnerAgainstDisposablePostgres() throws Exception {
        // 1. Verify target is PostgreSQL 17.6
        try (Connection conn = DriverManager.getConnection(STAGING_URL, STAGING_USER, STAGING_PASS)) {
            String dbVersion = conn.getMetaData().getDatabaseProductVersion();
            assertThat(dbVersion)
                    .withFailMessage("Target database must be PostgreSQL 17.6, found: %s", dbVersion)
                    .contains("17.6");

            // Verify promotion_redemption exists and single source constraint prerequisites are met
            try (Statement s = conn.createStatement();
                 ResultSet rs = s.executeQuery("SELECT count(*) FROM public.promotion_redemption WHERE order_id IS NULL")) {
                if (rs.next()) {
                    assertThat(rs.getInt(1)).isZero();
                }
            }
        }

        // 2. Set environment properties for the standalone runner
        System.setProperty("DB_URL", STAGING_URL);
        System.setProperty("DB_USERNAME", STAGING_USER);
        System.setProperty("DB_PASSWORD", STAGING_PASS);

        // 3. Execute the dedicated migration runner
        int exitCode = DedicatedFlywayMigrationRunner.run();
        assertThat(exitCode).isEqualTo(0);

        // 4. Verify post-migration state directly in PostgreSQL 17.6
        try (Connection conn = DriverManager.getConnection(STAGING_URL, STAGING_USER, STAGING_PASS)) {
            // Check flyway_schema_history
            try (Statement s = conn.createStatement();
                 ResultSet rs = s.executeQuery(
                         "SELECT version, success FROM flyway_schema_history WHERE version IN ('5', '6', '7') ORDER BY installed_rank")) {
                int count = 0;
                while (rs.next()) {
                    count++;
                    assertThat(rs.getBoolean("success")).isTrue();
                }
                assertThat(count).isEqualTo(3);
            }

            // Verify all key Billing tables exist
            DatabaseMetaData meta = conn.getMetaData();
            String[] expectedTables = {
                    "billing_pos_access", "billing_setup_state", "billing_access_audit",
                    "billing_discount_policy", "billing_staff_discount_limit", "billing_discount_request",
                    "billing_discount_audit_event", "billing_pos_sale", "billing_pos_sale_line",
                    "billing_discount_application", "billing_pos_tender", "billing_tax_configuration",
                    "billing_invoice_number_counter", "billing_invoice", "billing_invoice_line",
                    "billing_invoice_pdf", "billing_invoice_delivery_consent",
                    "billing_invoice_delivery_consent_event", "billing_invoice_delivery",
                    "billing_invoice_delivery_attempt", "billing_pos_sale_promotion",
                    "billing_online_invoice_job", "billing_online_invoice_job_attempt",
                    "billing_online_invoice_job_retry_request"
            };

            for (String table : expectedTables) {
                try (ResultSet rs = meta.getTables(null, "public", table, null)) {
                    assertThat(rs.next())
                            .withFailMessage("Table public.%s was not created by migrations", table)
                            .isTrue();
                }
            }

            // Verify immutable triggers exist and are attached
            String[] expectedTriggers = {
                    "billing_invoice_immutable",
                    "billing_invoice_line_immutable",
                    "billing_invoice_pdf_immutable",
                    "billing_delivery_attempt_immutable",
                    "billing_consent_event_immutable",
                    "billing_discount_application_immutable",
                    "billing_discount_audit_event_immutable",
                    "billing_access_audit_immutable",
                    "billing_pos_sale_immutable",
                    "billing_pos_sale_line_immutable",
                    "billing_pos_sale_promotion_immutable",
                    "billing_pos_tender_immutable",
                    "billing_online_invoice_job_attempt_immutable",
                    "billing_online_invoice_retry_request_immutable"
            };

            for (String trigger : expectedTriggers) {
                try (PreparedStatement ps = conn.prepareStatement(
                        "SELECT count(*) FROM information_schema.triggers WHERE trigger_name = ?")) {
                    ps.setString(1, trigger);
                    try (ResultSet rs = ps.executeQuery()) {
                        assertThat(rs.next() && rs.getInt(1) > 0)
                                .withFailMessage("Trigger %s was not found in information_schema.triggers", trigger)
                                .isTrue();
                    }
                }
            }

            // Verify constraint ck_promotion_redemption_single_source exists
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT count(*) FROM information_schema.table_constraints WHERE constraint_name = 'ck_promotion_redemption_single_source'")) {
                try (ResultSet rs = ps.executeQuery()) {
                    assertThat(rs.next() && rs.getInt(1) > 0)
                            .withFailMessage("Constraint ck_promotion_redemption_single_source missing")
                            .isTrue();
                }
            }
        }
    }
}

