package com.alahadattars.billing.gate2;

import com.alahadattars.billing.invoice.InvoiceChannel;
import com.alahadattars.billing.invoice.InvoiceCustomerSnapshot;
import com.alahadattars.billing.invoice.InvoiceJdbcRepository;
import com.alahadattars.billing.invoice.InvoiceLineSnapshot;
import com.alahadattars.billing.invoice.InvoicePaperFormat;
import com.alahadattars.billing.invoice.InvoiceSellerSnapshot;
import com.alahadattars.billing.invoice.InvoiceSnapshot;
import com.alahadattars.billing.invoice.InvoiceSourceType;
import com.alahadattars.billing.invoice.InvoiceTaxSnapshot;
import com.alahadattars.entity.Bottle;
import com.alahadattars.entity.Category;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.Promotion;
import com.alahadattars.entity.PromotionRedemption;
import com.alahadattars.enums.BottleApplicability;
import com.alahadattars.enums.CategoryType;
import com.alahadattars.enums.DiscountType;
import com.alahadattars.enums.Gender;
import com.alahadattars.enums.ProductType;
import com.alahadattars.enums.PromotionType;
import com.alahadattars.repository.BottleRepository;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.ProductRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.PromotionRedemptionRepository;
import com.alahadattars.repository.PromotionRepository;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceUtils;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.postgresql.PGConnection;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * PostgreSQL-only compatibility gate. This is a test harness, not a POS finalization service.
 * Run only against a fresh, disposable database named {@code gate2_verify} on 127.0.0.1.
 * Flyway is disabled and V5 is never executed by this test.
 */
@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = Gate2PostgresTransactionCompatibilityTest.JpaTestConfiguration.class)
@TestPropertySource(properties = {
        "spring.flyway.enabled=false",
        "spring.sql.init.mode=never",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.open-in-view=false",
        "spring.jpa.show-sql=false",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect",
        "spring.datasource.hikari.maximum-pool-size=16",
        "spring.main.web-application-type=none",
        "logging.level.root=WARN"
})
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class Gate2PostgresTransactionCompatibilityTest {

    private static final AtomicLong SOURCE_IDS = new AtomicLong(9_000_000L);

    @org.springframework.beans.factory.annotation.Autowired private DataSource dataSource;
    @org.springframework.beans.factory.annotation.Autowired private JdbcTemplate jdbc;
    @org.springframework.beans.factory.annotation.Autowired private PlatformTransactionManager transactionManager;
    @org.springframework.beans.factory.annotation.Autowired private CategoryRepository categoryRepository;
    @org.springframework.beans.factory.annotation.Autowired private ProductRepository productRepository;
    @org.springframework.beans.factory.annotation.Autowired private ProductVariantRepository variantRepository;
    @org.springframework.beans.factory.annotation.Autowired private BottleRepository bottleRepository;
    @org.springframework.beans.factory.annotation.Autowired private PromotionRepository promotionRepository;
    @org.springframework.beans.factory.annotation.Autowired private PromotionRedemptionRepository redemptionRepository;
    @org.springframework.beans.factory.annotation.Autowired private InvoiceJdbcRepository invoiceRepository;

    private TransactionTemplate transactions;

    @BeforeAll
    void verifyDisposableTargetAndCreateFixtures() throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            String url = connection.getMetaData().getURL();
            assertThat(url).startsWith("jdbc:postgresql://127.0.0.1:");
            assertThat(url).endsWith("/gate2_verify");
            assertThat(connection.getMetaData().getDatabaseProductVersion()).contains("17.6");
        }

        transactions = new TransactionTemplate(transactionManager);
        createBillingFixtures();
    }

    @BeforeEach
    void clearTestBillingFixtures() {
        jdbc.execute("TRUNCATE TABLE gate2_test_sale_marker, gate2_test_sale_request, "
                + "billing_invoice_line, billing_invoice_pdf, billing_invoice CASCADE");
    }

    @Test
    void successfulMixedJpaJdbcTransactionCommitsStockAndInvoiceTogether() {
        Fixture fixture = fixture(2, 2);
        boolean sharedBoundConnection = transactions.execute(status -> {
            Connection transactionConnection = DataSourceUtils.getConnection(dataSource);
            boolean same = jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<Boolean>)
                    callbackConnection -> transactionConnection.unwrap(PGConnection.class)
                            == callbackConnection.unwrap(PGConnection.class));
            assertThat(variantRepository.decrementStock(fixture.variantId(), 1)).isEqualTo(1);
            assertThat(bottleRepository.decrementStock(fixture.bottleId(), 1)).isEqualTo(1);
            writeInvoiceAndSaleMarker(fixture, "mixed-commit");
            return same;
        });

        assertThat(sharedBoundConnection).isTrue();
        assertThat(stockOfVariant(fixture.variantId())).isEqualTo(1);
        assertThat(stockOfBottle(fixture.bottleId())).isEqualTo(1);
        assertBillingRows(1, 1, 2, 1);
    }

    @Test
    void forcedFailureAfterVariantDecrementRollsBackJpaAndJdbcWrites() {
        Fixture fixture = fixture(2, 2);

        assertRollback(ForcedFailure.class, () -> transactions.execute(status -> {
            assertThat(variantRepository.decrementStock(fixture.variantId(), 1)).isEqualTo(1);
            writeInvoiceAndSaleMarker(fixture, "rollback-variant");
            throw new ForcedFailure();
        }));

        assertThat(stockOfVariant(fixture.variantId())).isEqualTo(2);
        assertBillingRows(0, 0, 0, 0);
    }

    @Test
    void forcedFailureAfterBottleDecrementRollsBackJpaAndJdbcWrites() {
        Fixture fixture = fixture(2, 2);

        assertRollback(ForcedFailure.class, () -> transactions.execute(status -> {
            assertThat(bottleRepository.decrementStock(fixture.bottleId(), 1)).isEqualTo(1);
            writeInvoiceAndSaleMarker(fixture, "rollback-bottle");
            throw new ForcedFailure();
        }));

        assertThat(stockOfBottle(fixture.bottleId())).isEqualTo(2);
        assertBillingRows(0, 0, 0, 0);
    }

    @Test
    void forcedFailureAfterJdbcWritesRollsBackAllChanges() {
        Fixture fixture = fixture(2, 2);

        assertRollback(ForcedFailure.class, () -> transactions.execute(status -> {
            assertThat(variantRepository.decrementStock(fixture.variantId(), 1)).isEqualTo(1);
            assertThat(bottleRepository.decrementStock(fixture.bottleId(), 1)).isEqualTo(1);
            writeInvoiceAndSaleMarker(fixture, "rollback-after-jdbc");
            throw new ForcedFailure();
        }));

        assertThat(stockOfVariant(fixture.variantId())).isEqualTo(2);
        assertThat(stockOfBottle(fixture.bottleId())).isEqualTo(2);
        assertBillingRows(0, 0, 0, 0);
    }

    @Test
    void concurrentSalesCannotOversellLastVariantStock() throws Exception {
        Fixture fixture = fixture(1, 20);
        List<Boolean> outcomes = race(8, () -> transactions.execute(status -> {
            if (variantRepository.decrementStock(fixture.variantId(), 1) == 0) return false;
            writeInvoiceAndSaleMarker(fixture, "variant-race-" + UUID.randomUUID());
            return true;
        }));

        assertThat(outcomes.stream().filter(Boolean::booleanValue).count()).isEqualTo(1);
        assertThat(stockOfVariant(fixture.variantId())).isZero();
        assertBillingRows(1, 1, 2, 1);
    }

    @Test
    void concurrentSalesCannotOversellLastBottleStock() throws Exception {
        Fixture fixture = fixture(20, 1);
        List<Boolean> outcomes = race(8, () -> transactions.execute(status -> {
            if (bottleRepository.decrementStock(fixture.bottleId(), 1) == 0) return false;
            writeInvoiceAndSaleMarker(fixture, "bottle-race-" + UUID.randomUUID());
            return true;
        }));

        assertThat(outcomes.stream().filter(Boolean::booleanValue).count()).isEqualTo(1);
        assertThat(stockOfBottle(fixture.bottleId())).isZero();
        assertBillingRows(1, 1, 2, 1);
    }

    @Test
    void combinedSaleRollsBackWhenEitherVariantOrBottleIsUnavailable() {
        Fixture bottleUnavailable = fixture(1, 0);
        assertRollback(InsufficientStock.class, () -> transactions.execute(status -> {
            assertThat(variantRepository.decrementStock(bottleUnavailable.variantId(), 1)).isEqualTo(1);
            if (bottleRepository.decrementStock(bottleUnavailable.bottleId(), 1) == 0) {
                throw new InsufficientStock();
            }
            writeInvoiceAndSaleMarker(bottleUnavailable, "unreachable-bottle-unavailable");
            return null;
        }));
        assertThat(stockOfVariant(bottleUnavailable.variantId())).isEqualTo(1);
        assertThat(stockOfBottle(bottleUnavailable.bottleId())).isZero();
        assertBillingRows(0, 0, 0, 0);

        Fixture variantUnavailable = fixture(0, 1);
        assertRollback(InsufficientStock.class, () -> transactions.execute(status -> {
            if (variantRepository.decrementStock(variantUnavailable.variantId(), 1) == 0) {
                throw new InsufficientStock();
            }
            assertThat(bottleRepository.decrementStock(variantUnavailable.bottleId(), 1)).isEqualTo(1);
            writeInvoiceAndSaleMarker(variantUnavailable, "unreachable-variant-unavailable");
            return null;
        }));
        assertThat(stockOfVariant(variantUnavailable.variantId())).isZero();
        assertThat(stockOfBottle(variantUnavailable.bottleId())).isEqualTo(1);
        assertBillingRows(0, 0, 0, 0);
    }

    @Test
    void concurrentDuplicateIdempotencyRequestsCreateOneSaleAndDeductOnce() throws Exception {
        Fixture fixture = fixture(2, 2);
        String key = UUID.randomUUID().toString();
        List<Boolean> outcomes = race(8, () -> finalizeTestSale(fixture, key, "same-payload"));

        assertThat(outcomes.stream().filter(Boolean::booleanValue).count()).isEqualTo(1);
        assertThat(stockOfVariant(fixture.variantId())).isEqualTo(1);
        assertBillingRows(1, 1, 2, 1);
        assertThat(count("gate2_test_sale_request")).isEqualTo(1);
    }

    @Test
    void idempotencyKeyWithDifferentPayloadIsRejectedWithoutSecondDeduction() {
        Fixture fixture = fixture(2, 2);
        String key = UUID.randomUUID().toString();

        assertThat(finalizeTestSale(fixture, key, "first-payload")).isTrue();
        assertThatThrownBy(() -> finalizeTestSale(fixture, key, "different-payload"))
                .isInstanceOf(IdempotencyPayloadConflict.class);

        assertThat(stockOfVariant(fixture.variantId())).isEqualTo(1);
        assertBillingRows(1, 1, 2, 1);
        assertThat(count("gate2_test_sale_request")).isEqualTo(1);
    }

    @Test
    void concurrentPromotionClaimsDoNotExceedExistingGlobalLimit() throws Exception {
        Promotion promotion = promotion(3);
        List<Boolean> outcomes = race(12, () -> transactions.execute(status -> {
            if (promotionRepository.claimRedemption(promotion.getId()) == 0) return false;
            redemptionRepository.saveAndFlush(redemption(promotion));
            return true;
        }));

        assertThat(outcomes.stream().filter(Boolean::booleanValue).count()).isEqualTo(3);
        assertThat(promotionRepository.findById(promotion.getId()).orElseThrow().getUsedCount()).isEqualTo(3);
        assertThat(redemptionCount(promotion)).isEqualTo(3);
    }

    @Test
    void failedSaleRollsBackGlobalPromotionClaimAndRedemption() {
        Fixture fixture = fixture(2, 2);
        Promotion promotion = promotion(5);

        assertRollback(ForcedFailure.class, () -> transactions.execute(status -> {
            assertThat(promotionRepository.claimRedemption(promotion.getId())).isEqualTo(1);
            assertThat(variantRepository.decrementStock(fixture.variantId(), 1)).isEqualTo(1);
            redemptionRepository.saveAndFlush(redemption(promotion));
            writeInvoiceAndSaleMarker(fixture, "rollback-promotion");
            throw new ForcedFailure();
        }));

        assertThat(promotionRepository.findById(promotion.getId()).orElseThrow().getUsedCount()).isZero();
        assertThat(redemptionCount(promotion)).isZero();
        assertThat(stockOfVariant(fixture.variantId())).isEqualTo(2);
        assertBillingRows(0, 0, 0, 0);
    }

    @Test
    void freeItemStockAndGlobalPromotionRedemptionRemainConsistentUnderContention() throws Exception {
        Fixture fixture = fixture(1, 1);
        Promotion promotion = promotion(5);
        List<Boolean> outcomes = race(8, () -> {
            try {
                return transactions.execute(status -> {
                    if (promotionRepository.claimRedemption(promotion.getId()) == 0) return false;
                    if (variantRepository.decrementStock(fixture.variantId(), 1) == 0) {
                        throw new InsufficientStock();
                    }
                    if (bottleRepository.decrementStock(fixture.bottleId(), 1) == 0) {
                        throw new InsufficientStock();
                    }
                    redemptionRepository.saveAndFlush(redemption(promotion));
                    writeInvoiceAndSaleMarker(fixture, "free-item-" + UUID.randomUUID());
                    return true;
                });
            } catch (InsufficientStock expectedRollback) {
                return false;
            }
        });

        assertThat(outcomes.stream().filter(Boolean::booleanValue).count()).isEqualTo(1);
        assertThat(promotionRepository.findById(promotion.getId()).orElseThrow().getUsedCount()).isEqualTo(1);
        assertThat(redemptionCount(promotion)).isEqualTo(1);
        assertThat(stockOfVariant(fixture.variantId())).isZero();
        assertThat(stockOfBottle(fixture.bottleId())).isZero();
        assertBillingRows(1, 1, 2, 1);
    }

    private boolean finalizeTestSale(Fixture fixture, String idempotencyKey, String payload) {
        String payloadHash = sha256(payload);
        return transactions.execute(status -> {
            int inserted = jdbc.update("INSERT INTO gate2_test_sale_request (idempotency_key, payload_hash) "
                            + "VALUES (?, ?) ON CONFLICT (idempotency_key) DO NOTHING",
                    idempotencyKey, payloadHash);
            if (inserted == 0) {
                String existingHash = jdbc.queryForObject(
                        "SELECT payload_hash FROM gate2_test_sale_request WHERE idempotency_key = ?",
                        String.class, idempotencyKey);
                if (!payloadHash.equals(existingHash)) throw new IdempotencyPayloadConflict();
                return false;
            }
            if (variantRepository.decrementStock(fixture.variantId(), 1) == 0) throw new InsufficientStock();
            writeInvoiceAndSaleMarker(fixture, "idempotent-" + idempotencyKey);
            return true;
        });
    }

    private void writeInvoiceAndSaleMarker(Fixture fixture, String marker) {
        long invoiceId = invoiceRepository.store(invoice(fixture), "2026-27", Map.of(
                        InvoicePaperFormat.A4, new byte[]{0x25, 0x50, 0x44, 0x46},
                        InvoicePaperFormat.THERMAL_80, new byte[]{0x25, 0x50, 0x44, 0x46, 0x38}));
        jdbc.update("INSERT INTO gate2_test_sale_marker (marker_key, invoice_id) VALUES (?, ?)", marker, invoiceId);
    }

    private InvoiceSnapshot invoice(Fixture fixture) {
        BigDecimal unit = new BigDecimal("100.00");
        BigDecimal bottle = new BigDecimal("5.00");
        BigDecimal gross = unit.add(bottle);
        return new InvoiceSnapshot(
                UUID.randomUUID(), "G2-" + UUID.randomUUID(), InvoiceChannel.POS, InvoiceSourceType.POS_SALE,
                SOURCE_IDS.incrementAndGet(), Instant.now(), new InvoiceSellerSnapshot("Gate 2 Test", null, null, null),
                new InvoiceCustomerSnapshot("Test customer", null, null),
                List.of(new InvoiceLineSnapshot(1, fixture.productId(), fixture.variantId(), "Test product", "10 ml", 1,
                        unit, fixture.bottleId(), "Test bottle", bottle, BigDecimal.ZERO, BigDecimal.ZERO, gross)),
                gross, BigDecimal.ZERO, BigDecimal.ZERO, gross, InvoiceTaxSnapshot.noGst(),
                "Test-only unregistered invoice wording");
    }

    private Fixture fixture(int variantStock, int bottleStock) {
        LocalDateTime now = LocalDateTime.now();
        String suffix = UUID.randomUUID().toString().substring(0, 12);
        Category category = Category.builder().name("Gate2 " + suffix).description("test")
                .image("test").type(CategoryType.ATTARS).active(true).build();
        timestamps(category, now);
        category = categoryRepository.saveAndFlush(category);

        Product product = Product.builder().name("Gate2 Product " + suffix).slug("gate2-" + suffix)
                .shortDescription("test").description("test").brand("test").category(category)
                .fragranceFamily("test").topNotes("test").middleNotes("test").baseNotes("test")
                .longevity("test").projection("test").gender(Gender.UNISEX).active(true).build();
        timestamps(product, now);
        product = productRepository.saveAndFlush(product);

        ProductVariant variant = ProductVariant.builder().product(product).productType(ProductType.GENERAL)
                .size("10 ml").price(new BigDecimal("100.00")).discountedPrice(new BigDecimal("100.00"))
                .stock(variantStock).sku("G2-" + suffix).active(true).build();
        timestamps(variant, now);
        variant = variantRepository.saveAndFlush(variant);

        Bottle bottle = Bottle.builder().name("Gate2 bottle " + suffix).price(new BigDecimal("5.00"))
                .stockQuantity(bottleStock).active(true).applicability(BottleApplicability.BOTH).build();
        timestamps(bottle, now);
        bottle = bottleRepository.saveAndFlush(bottle);
        return new Fixture(product.getId(), variant.getId(), bottle.getId());
    }

    private Promotion promotion(int globalLimit) {
        Promotion promotion = Promotion.builder().name("Gate2 promotion " + UUID.randomUUID())
                .promotionType(PromotionType.FREE_PRODUCT).discountType(DiscountType.FREE_ITEM)
                .usageLimit(globalLimit).usedCount(0).priority(1).active(true).stackable(false).build();
        timestamps(promotion, LocalDateTime.now());
        return promotionRepository.saveAndFlush(promotion);
    }

    private PromotionRedemption redemption(Promotion promotion) {
        PromotionRedemption redemption = new PromotionRedemption();
        redemption.setPromotion(promotion);
        redemption.setGuestEmail("gate2-test@example.invalid");
        timestamps(redemption, LocalDateTime.now());
        return redemption;
    }

    private long redemptionCount(Promotion promotion) {
        return redemptionRepository.countByPromotionIdAndEmail(promotion.getId(), "gate2-test@example.invalid");
    }

    private static void timestamps(com.alahadattars.entity.BaseEntity entity, LocalDateTime at) {
        entity.setCreatedAt(at);
        entity.setUpdatedAt(at);
    }

    private int stockOfVariant(Long id) {
        return jdbc.queryForObject("SELECT stock FROM product_variant WHERE id = ?", Integer.class, id);
    }

    private int stockOfBottle(Long id) {
        return jdbc.queryForObject("SELECT stock_quantity FROM bottle WHERE id = ?", Integer.class, id);
    }

    private long count(String table) {
        if (!List.of("gate2_test_sale_request", "gate2_test_sale_marker", "billing_invoice",
                "billing_invoice_line", "billing_invoice_pdf").contains(table)) {
            throw new IllegalArgumentException("Unapproved fixture table");
        }
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Long.class);
    }

    private void assertBillingRows(long headers, long lines, long pdfs, long markers) {
        assertThat(count("billing_invoice")).isEqualTo(headers);
        assertThat(count("billing_invoice_line")).isEqualTo(lines);
        assertThat(count("billing_invoice_pdf")).isEqualTo(pdfs);
        assertThat(count("gate2_test_sale_marker")).isEqualTo(markers);
    }

    private void assertRollback(Class<? extends RuntimeException> expectedType, ThrowingAction action) {
        assertThatThrownBy(action::run).isExactlyInstanceOf(expectedType);
    }

    private static List<Boolean> race(int contenders, Callable<Boolean> task) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(contenders);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<Boolean>> futures = new java.util.ArrayList<>();
            for (int index = 0; index < contenders; index++) {
                futures.add(executor.submit(() -> {
                    start.await();
                    return task.call();
                }));
            }
            start.countDown();
            return futures.stream().map(future -> {
                try {
                    return future.get();
                } catch (Exception failure) {
                    throw new IllegalStateException("Concurrent Gate 2 contender failed", failure);
                }
            }).toList();
        } finally {
            executor.shutdownNow();
        }
    }

    private void createBillingFixtures() {
        jdbc.execute("""
                CREATE TABLE billing_invoice (
                    id BIGSERIAL PRIMARY KEY,
                    invoice_key UUID NOT NULL,
                    invoice_number VARCHAR(100) NOT NULL UNIQUE,
                    invoice_channel VARCHAR(20) NOT NULL,
                    source_type VARCHAR(30) NOT NULL,
                    source_id BIGINT NOT NULL,
                    financial_year VARCHAR(20) NOT NULL,
                    invoice_status VARCHAR(20) NOT NULL,
                    seller_name_snapshot VARCHAR(255) NOT NULL,
                    seller_address_snapshot TEXT,
                    seller_phone_snapshot VARCHAR(64),
                    seller_email_snapshot VARCHAR(254),
                    customer_name_snapshot VARCHAR(255),
                    customer_mobile_snapshot VARCHAR(64),
                    customer_email_snapshot VARCHAR(254),
                    subtotal_amount NUMERIC(12,2) NOT NULL,
                    promotion_discount_amount NUMERIC(12,2) NOT NULL,
                    manual_discount_amount NUMERIC(12,2) NOT NULL,
                    total_amount NUMERIC(12,2) NOT NULL,
                    gst_status VARCHAR(24) NOT NULL,
                    gstin_snapshot VARCHAR(64),
                    gst_enabled BOOLEAN NOT NULL,
                    tax_mode VARCHAR(24) NOT NULL,
                    invoice_notice_snapshot TEXT,
                    issued_at TIMESTAMPTZ NOT NULL
                )
                """);
        jdbc.execute("""
                CREATE TABLE billing_invoice_line (
                    id BIGSERIAL PRIMARY KEY,
                    invoice_id BIGINT NOT NULL REFERENCES billing_invoice(id) ON DELETE CASCADE,
                    line_number INTEGER NOT NULL,
                    product_id BIGINT,
                    variant_id BIGINT,
                    product_name_snapshot VARCHAR(255) NOT NULL,
                    variant_size_snapshot VARCHAR(100),
                    quantity INTEGER NOT NULL,
                    unit_price_snapshot NUMERIC(12,2) NOT NULL,
                    bottle_id BIGINT,
                    bottle_name_snapshot VARCHAR(255),
                    bottle_price_snapshot NUMERIC(12,2) NOT NULL,
                    promotion_discount_amount NUMERIC(12,2) NOT NULL,
                    manual_discount_amount NUMERIC(12,2) NOT NULL,
                    line_total_amount NUMERIC(12,2) NOT NULL,
                    is_free_item BOOLEAN NOT NULL DEFAULT FALSE,
                    free_promotion_id BIGINT
                )
                """);
        jdbc.execute("""
                CREATE TABLE billing_invoice_pdf (
                    id BIGSERIAL PRIMARY KEY,
                    invoice_id BIGINT NOT NULL REFERENCES billing_invoice(id) ON DELETE CASCADE,
                    paper_format VARCHAR(24) NOT NULL,
                    sha256 VARCHAR(64) NOT NULL,
                    pdf_data BYTEA NOT NULL,
                    CONSTRAINT uq_gate2_invoice_pdf UNIQUE (invoice_id, paper_format)
                )
                """);
        jdbc.execute("""
                CREATE TABLE gate2_test_sale_request (
                    idempotency_key VARCHAR(100) PRIMARY KEY,
                    payload_hash VARCHAR(64) NOT NULL
                )
                """);
        jdbc.execute("""
                CREATE TABLE gate2_test_sale_marker (
                    marker_key VARCHAR(150) PRIMARY KEY,
                    invoice_id BIGINT NOT NULL REFERENCES billing_invoice(id)
                )
                """);
    }

    private static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException unavailable) {
            throw new IllegalStateException("SHA-256 is unavailable", unavailable);
        }
    }

    @Configuration(proxyBeanMethods = false)
    @EnableAutoConfiguration
    @EntityScan(basePackages = "com.alahadattars.entity")
    @EnableJpaRepositories(basePackages = "com.alahadattars.repository")
    @Import(InvoiceJdbcRepository.class)
    static class JpaTestConfiguration {
    }

    private record Fixture(Long productId, Long variantId, Long bottleId) {
    }

    @FunctionalInterface
    private interface ThrowingAction {
        void run() throws Throwable;
    }

    private static final class ForcedFailure extends RuntimeException {
    }

    private static final class InsufficientStock extends RuntimeException {
    }

    private static final class IdempotencyPayloadConflict extends RuntimeException {
    }
}
