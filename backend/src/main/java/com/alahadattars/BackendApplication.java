package com.alahadattars;

import com.alahadattars.migration.DedicatedFlywayMigrationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableCaching
@EnableJpaAuditing
public class BackendApplication {

    public static void main(String[] args) {
        boolean migrateOnly = false;
        if ("true".equalsIgnoreCase(System.getenv("FLYWAY_MIGRATE_ONLY"))
                || "true".equalsIgnoreCase(System.getProperty("flyway.migrate.only"))) {
            migrateOnly = true;
        }
        if (args != null) {
            for (String arg : args) {
                if ("--migrate-only".equalsIgnoreCase(arg) || "-migrate-only".equalsIgnoreCase(arg)) {
                    migrateOnly = true;
                    break;
                }
            }
        }

        if (migrateOnly) {
            int exitCode = DedicatedFlywayMigrationRunner.run();
            if (exitCode != 0) {
                System.exit(exitCode);
            }
            return;
        }

        SpringApplication.run(BackendApplication.class, args);
    }

}
