package com.alahadattars.migration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.flywaydb.core.api.output.MigrateResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Dedicated, isolated Flyway migration runner.
 * <p>
 * Executes database migrations directly using Hikari/JDBC and Flyway core without
 * booting the Spring ApplicationContext, Tomcat web server, Hibernate JPA layer,
 * CommandLineRunners (e.g. VariantPriceMigrationRunner), or background worker schedulers.
 */
public class DedicatedFlywayMigrationRunner {

    private static final Logger log = LoggerFactory.getLogger(DedicatedFlywayMigrationRunner.class);

    public static void main(String[] args) {
        int exitCode = run();
        if (exitCode != 0) {
            System.exit(exitCode);
        }
    }

    public static int run() {
        String url = resolveProperty("DB_URL", "spring.datasource.url");
        String username = resolveProperty("DB_USERNAME", "spring.datasource.username");
        String password = resolveProperty("DB_PASSWORD", "spring.datasource.password");

        if (url == null || username == null || password == null) {
            log.error("[MIGRATION_RUNNER] FATAL: Missing database credentials. DB_URL, DB_USERNAME, and DB_PASSWORD must be set.");
            return 1;
        }

        log.info("================================================================================");
        log.info("AL AHAD ATTARS — DEDICATED FLYWAY MIGRATION RUNNER");
        log.info("Datasource Target : {}", maskJdbcUrl(url));
        log.info("Datasource User   : {}", username);
        log.info("Isolation Mode    : Standalone CLI (SpringContext=NONE, WebServer=NONE, JPA=NONE)");
        log.info("================================================================================");

        try {
            Flyway flyway = Flyway.configure()
                    .dataSource(url, username, password)
                    .baselineOnMigrate(true)
                    .baselineVersion("1")
                    .baselineDescription("Initial JPA Baseline")
                    .locations("classpath:db/migration")
                    .load();

            log.info("[MIGRATION_RUNNER] Inspecting migration history before execution...");
            MigrationInfo[] currentInfos = flyway.info().all();
            for (MigrationInfo info : currentInfos) {
                log.info("  Migration [{}] - {} | State: {} | Installed On: {}",
                        info.getVersion(), info.getDescription(), info.getState(), info.getInstalledOn());
            }

            MigrationInfo[] pending = flyway.info().pending();
            log.info("[MIGRATION_RUNNER] Pending migrations count: {}", pending.length);
            for (MigrationInfo p : pending) {
                log.info("  -> PENDING: [{}] {}", p.getVersion(), p.getDescription());
            }

            log.info("[MIGRATION_RUNNER] Executing flyway.migrate()...");
            MigrateResult result = flyway.migrate();

            log.info("================================================================================");
            log.info("MIGRATION EXECUTION COMPLETED");
            log.info("  Success                : {}", result.success);
            log.info("  Initial Schema Version : {}", result.initialSchemaVersion);
            log.info("  Target Schema Version  : {}", result.targetSchemaVersion);
            log.info("  Migrations Executed    : {}", result.migrationsExecuted);
            log.info("================================================================================");

            if (!result.success) {
                log.error("[MIGRATION_RUNNER] Flyway migration reported failure.");
                return 1;
            }

            return 0;
        } catch (Exception e) {
            log.error("[MIGRATION_RUNNER] FATAL EXCEPTION during Flyway migration: {}", e.getMessage(), e);
            return 2;
        }
    }

    private static String resolveProperty(String envVar, String sysProp) {
        String val = System.getenv(envVar);
        if (val != null && !val.isBlank()) {
            return val;
        }
        val = System.getProperty(sysProp);
        if (val != null && !val.isBlank()) {
            return val;
        }
        val = System.getProperty(envVar);
        if (val != null && !val.isBlank()) {
            return val;
        }
        return null;
    }

    private static String maskJdbcUrl(String url) {
        if (url == null) return "null";
        // Strip out any query parameters that could contain sensitive tokens
        int queryIndex = url.indexOf('?');
        if (queryIndex > 0) {
            return url.substring(0, queryIndex) + "?...";
        }
        return url;
    }
}

