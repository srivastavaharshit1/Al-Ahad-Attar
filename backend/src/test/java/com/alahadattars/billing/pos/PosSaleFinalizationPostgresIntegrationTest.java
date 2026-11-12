package com.alahadattars.billing.pos;

import com.alahadattars.billing.online.OnlineInvoiceGenerationService;
import com.alahadattars.billing.online.OnlineInvoiceJob;
import com.alahadattars.billing.online.OnlineInvoiceJobJdbcRepository;
import com.alahadattars.billing.delivery.InvoiceConsentStatus;
import com.alahadattars.billing.delivery.InvoiceDeliveryChannel;
import com.alahadattars.billing.delivery.InvoiceDeliveryJdbcRepository;
import com.alahadattars.billing.delivery.InvoiceDeliveryStatus;
import com.alahadattars.billing.invoice.InvoiceJdbcRepository;
import com.alahadattars.billing.invoice.InvoicePaperFormat;
import com.alahadattars.billing.reporting.BillingReportingRepository;
import com.alahadattars.billing.security.AuthenticatedBillingAdmin;
import com.alahadattars.billing.sale.TenderMethod;
import com.alahadattars.entity.Address;
import com.alahadattars.entity.Bottle;
import com.alahadattars.entity.Category;
import com.alahadattars.entity.Order;
import com.alahadattars.entity.OrderItem;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.Promotion;
import com.alahadattars.entity.PromotionConfiguration;
import com.alahadattars.entity.Role;
import com.alahadattars.entity.User;
import com.alahadattars.enums.BottleApplicability;
import com.alahadattars.enums.CategoryType;
import com.alahadattars.enums.DiscountType;
import com.alahadattars.enums.Gender;
import com.alahadattars.enums.ProductType;
import com.alahadattars.enums.OrderStatus;
import com.alahadattars.enums.PaymentStatus;
import com.alahadattars.enums.RefundStatus;
import com.alahadattars.enums.PromotionType;
import com.alahadattars.enums.RoleType;
import com.alahadattars.exception.ConflictException;
import com.alahadattars.repository.BottleRepository;
import com.alahadattars.repository.AddressRepository;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.OrderRepository;
import com.alahadattars.repository.ProductRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.PromotionRedemptionRepository;
import com.alahadattars.repository.PromotionRepository;
import com.alahadattars.repository.RoleRepository;
import com.alahadattars.repository.UserRepository;
import com.alahadattars.service.ProductImageResolver;
import com.alahadattars.service.StorageService;
import com.alahadattars.service.impl.PromotionEngineServiceImpl;
import com.alahadattars.service.impl.PromotionResponseMapper;
import com.alahadattars.service.promotion.EligibilityConditionFactory;
import com.alahadattars.service.promotion.LegacyCategoryDiscountCondition;
import com.alahadattars.service.promotion.LegacyProductDiscountCondition;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

import javax.sql.DataSource;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Full POS finalization tests against an explicitly disposable local PostgreSQL 17.6 database.
 * Hibernate creates a synthetic core schema after a pre-connect identity guard; the exact local
 * V5 and V6 migration resources are then applied to that synthetic baseline. No remote database is
 * accepted by the guard. Run with -Dpos.finalize.jdbc-url=jdbc:postgresql://127.0.0.1:60259/pos_finalize_verify.
 */
@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = PosSaleFinalizationPostgresIntegrationTest.JpaTestConfiguration.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class PosSaleFinalizationPostgresIntegrationTest {
    private static final String DATABASE_NAME = "pos_finalize_verify";
    private static final int DATABASE_PORT = 60259;
    private static final String TEST_URL_PREFIX = "jdbc:postgresql://127.0.0.1:" + DATABASE_PORT + "/" + DATABASE_NAME;
    private static final String SELLER = "POS Integration Test Seller";
    private static final String NOTICE = "Test wording for an unregistered commercial invoice.";

    @org.springframework.beans.factory.annotation.Autowired private DataSource dataSource;
    @org.springframework.beans.factory.annotation.Autowired private JdbcTemplate jdbc;
    @org.springframework.beans.factory.annotation.Autowired private OnlineInvoiceJobJdbcRepository onlineInvoiceJobs;
    @org.springframework.beans.factory.annotation.Autowired private OnlineInvoiceGenerationService onlineInvoiceGeneration;
    @org.springframework.beans.factory.annotation.Autowired private InvoiceJdbcRepository invoiceRepository;
    @org.springframework.beans.factory.annotation.Autowired private InvoiceDeliveryJdbcRepository invoiceDeliveryRepository;
    @org.springframework.beans.factory.annotation.Autowired private BillingReportingRepository billingReporting;
    @org.springframework.beans.factory.annotation.Autowired private AddressRepository addressRepository;
    @org.springframework.beans.factory.annotation.Autowired private OrderRepository orderRepository;
    @org.springframework.beans.factory.annotation.Autowired private PosQuoteService quoteService;
    @org.springframework.beans.factory.annotation.Autowired private PosSaleFinalizationService finalizationService;
    @org.springframework.beans.factory.annotation.Autowired private CategoryRepository categoryRepository;
    @org.springframework.beans.factory.annotation.Autowired private ProductRepository productRepository;
    @org.springframework.beans.factory.annotation.Autowired private ProductVariantRepository variantRepository;
    @org.springframework.beans.factory.annotation.Autowired private BottleRepository bottleRepository;
    @org.springframework.beans.factory.annotation.Autowired private PromotionRepository promotionRepository;
    @org.springframework.beans.factory.annotation.Autowired private PromotionRedemptionRepository redemptionRepository;
    @org.springframework.beans.factory.annotation.Autowired private RoleRepository roleRepository;
    @org.springframework.beans.factory.annotation.Autowired private UserRepository userRepository;

    private AuthenticatedBillingAdmin admin;

    @DynamicPropertySource
    static void localPostgresProperties(DynamicPropertyRegistry registry) {
        String url = System.getProperty("pos.finalize.jdbc-url");
        if (url == null || !url.equals(TEST_URL_PREFIX)) {
            throw new IllegalStateException("Refusing POS PostgreSQL tests: expected the dedicated loopback database URL "
                    + TEST_URL_PREFIX + ". No database schema action was started.");
        }
        verifyDedicatedDatabaseBeforeSchemaInitialization(url);

        registry.add("spring.datasource.url", () -> url);
        registry.add("spring.datasource.username", () -> System.getProperty("pos.finalize.jdbc-username", "postgres"));
        registry.add("spring.datasource.password", () -> System.getProperty("pos.finalize.jdbc-password", ""));
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.datasource.hikari.maximum-pool-size", () -> "20");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("spring.jpa.open-in-view", () -> "false");
        registry.add("spring.jpa.show-sql", () -> "false");
        registry.add("spring.flyway.enabled", () -> "false");
        registry.add("spring.sql.init.mode", () -> "never");
        registry.add("spring.main.web-application-type", () -> "none");
        registry.add("billing.invoice.seller.name", () -> SELLER);
        registry.add("billing.invoice.pos-number-format", () -> "POS-{financialYear}-{sequence}");
        registry.add("billing.invoice.online-number-format", () -> "WEB-{financialYear}-{sequence}");
        registry.add("billing.invoice.unregistered-notice", () -> NOTICE);
        registry.add("billing.invoice.financial-year", () -> "TEST-FY");
    }

    private static void verifyDedicatedDatabaseBeforeSchemaInitialization(String url) {
        String username = System.getProperty("pos.finalize.jdbc-username", "postgres");
        String password = System.getProperty("pos.finalize.jdbc-password", "");
        try (Connection connection = DriverManager.getConnection(url, username, password);
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT current_database(), host(inet_server_addr()), inet_server_port(), version()")) {
            if (!result.next() || !DATABASE_NAME.equals(result.getString(1))
                    || !"127.0.0.1".equals(result.getString(2))
                    || result.getInt(3) != DATABASE_PORT || !result.getString(4).contains("17.6")) {
                throw new IllegalStateException("Refusing POS tests: connected PostgreSQL identity does not match "
                        + "the dedicated local disposable PostgreSQL 17.6 target.");
            }
        } catch (Exception failure) {
            throw new IllegalStateException("Refusing POS tests: local PostgreSQL identity preflight failed.", failure);
        }
    }

    @BeforeAll
    void applyDraftBillingMigrationsToSyntheticBaseline() throws IOException {
        removeHibernateBillingTablesBeforeMigration();
        // Hibernate's synthetic core baseline includes the new JPA property. Remove that one V6
        // column so the reviewed V5/V6 chain exercises the same pre-V6 state as an old schema.
        jdbc.execute("ALTER TABLE promotion_redemption DROP COLUMN pos_sale_id");
        executeMigration("db/migration/V5__add_billing_pos_foundation.sql");
        executeMigration("db/migration/V6__finalize_pos_sale_transactions.sql");
        executeMigration("db/migration/V7__online_invoice_generation_outbox.sql");

        Role role = Role.builder().name(RoleType.ADMIN).description("Synthetic POS integration Admin").active(true).build();
        timestamps(role);
        role = roleRepository.saveAndFlush(role);
        User user = User.builder().firstName("POS").lastName("Integration")
                .email("pos-integration-" + UUID.randomUUID() + "@example.test")
                .phone("+919" + String.format("%09d", Math.abs(UUID.randomUUID().getLeastSignificantBits() % 1_000_000_000L)))
                .password("test-only-not-a-login-credential").enabled(true).role(role).build();
        timestamps(user);
        user = userRepository.saveAndFlush(user);
        admin = new AuthenticatedBillingAdmin(user.getId(), user.getEmail());
    }

    private void removeHibernateBillingTablesBeforeMigration() {
        List<String> tables = jdbc.queryForList("""
                SELECT quote_ident(schemaname) || '.' || quote_ident(tablename)
                FROM pg_tables
                WHERE schemaname = current_schema() AND left(tablename, 8) = 'billing_'
                """, String.class);
        for (String table : tables) jdbc.execute("DROP TABLE " + table + " CASCADE");
        jdbc.execute("DROP FUNCTION IF EXISTS billing_reject_immutable_snapshot_mutation() CASCADE");
    }

    private void executeMigration(String resourceName) throws IOException {
        byte[] bytes;
        try (var input = Thread.currentThread().getContextClassLoader().getResourceAsStream(resourceName)) {
            if (input == null) throw new IllegalStateException("Migration resource is missing: " + resourceName);
            bytes = input.readAllBytes();
        }
        try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            statement.execute(new String(bytes, StandardCharsets.UTF_8));
            connection.commit();
        } catch (java.sql.SQLException failure) {
            throw new IllegalStateException("Local disposable migration failed: " + resourceName, failure);
        }
    }

    @Test
    void successfulSalePersistsSnapshotsTenderAndBothInvoicePdfs() {
        Fixture fixture = fixture("success", 5, 5);
        String lineKey = "sale-line-1";
        PosQuoteRequest quoteRequest = new PosQuoteRequest(List.of(line(lineKey, fixture, 2)), null,
                List.of(new PosQuoteRequest.ManualDiscount(com.alahadattars.billing.discount.DiscountScope.ITEM,
                        com.alahadattars.billing.discount.DiscountType.FIXED, new BigDecimal("10.00"),
                        lineKey, "Approved test adjustment")), List.of(), null, null, null);
        PosQuoteResponse quote = quoteService.quote(quoteRequest, admin);
        PosSaleFinalizeResponse response = finalizeWithQuote("success-key-00000001", quoteRequest, quote,
                TenderMethod.CASH, "250.00", null);

        assertThat(response.status()).isEqualTo("COMPLETED");
        assertThat(response.subtotal()).isEqualByComparingTo("210.00");
        assertThat(response.manualDiscount()).isEqualByComparingTo("10.00");
        assertThat(response.payableAmount()).isEqualByComparingTo("200.00");
        assertThat(response.amountReceived()).isEqualByComparingTo("250.00");
        assertThat(response.changeReturned()).isEqualByComparingTo("50.00");
        assertThat(response.amountApplied()).isEqualByComparingTo("200.00");
        assertThat(stock(fixture.variant().getId())).isEqualTo(3);
        assertThat(bottleStock(fixture.bottle().getId())).isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_pos_sale WHERE id = ? AND sale_status = 'COMPLETED'", Long.class, response.saleId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_pos_sale_line WHERE sale_id = ?", Long.class, response.saleId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT staff_user_id FROM billing_discount_application WHERE sale_id = ?", Long.class, response.saleId())).isEqualTo(admin.userId());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_pos_tender WHERE sale_id = ?", Long.class, response.saleId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_invoice WHERE id = ? AND invoice_channel = 'POS' AND gst_status = 'UNREGISTERED' AND gstin_snapshot IS NULL AND gst_enabled = FALSE AND tax_mode = 'NO_GST'", Long.class, response.invoiceId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_invoice_pdf WHERE invoice_id = ? AND paper_format IN ('A4','THERMAL_80')", Long.class, response.invoiceId())).isEqualTo(2);
        for (InvoicePaperFormat format : List.of(InvoicePaperFormat.A4, InvoicePaperFormat.THERMAL_80)) {
            var document = invoiceRepository.findPdf(response.invoiceId(), format).orElseThrow();
            assertThat(document.format()).isEqualTo(format);
            assertThat(new String(document.content(), 0, 5, StandardCharsets.US_ASCII)).isEqualTo("%PDF-");
        }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_invoice_line WHERE invoice_id = ? AND is_free_item = FALSE", Long.class, response.invoiceId())).isEqualTo(1);
    }

    @Test
    void paidOnlineOrderIsPolledIntoOneImmutableInvoiceAndServerSideReports() {
        Fixture fixture = fixture("online-invoice", 5, 5);
        Order order = paidOnlineOrder(fixture);

        assertThat(onlineInvoiceJobs.discoverEligibleOrders(100)).isEqualTo(1);
        // Repeated sweeps stand in for duplicate payment/webhook notifications: source state remains
        // authoritative and the unique order job prevents duplicate invoice work.
        onlineInvoiceJobs.discoverEligibleOrders(100);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_online_invoice_job WHERE order_id = ?",
                Long.class, order.getId())).isEqualTo(1);
        List<OnlineInvoiceJob> claimed = onlineInvoiceJobs.claimDue(20);
        OnlineInvoiceJob job = claimed.stream().filter(item -> item.orderId() == order.getId()).findFirst().orElseThrow();
        onlineInvoiceGeneration.process(job);

        Long invoiceId = jdbc.queryForObject("""
                SELECT id FROM billing_invoice WHERE source_type = 'ONLINE_ORDER' AND source_id = ?
                """, Long.class, order.getId());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_invoice WHERE source_type = 'ONLINE_ORDER' AND source_id = ?",
                Long.class, order.getId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_invoice_pdf WHERE invoice_id = ?",
                Long.class, invoiceId)).isEqualTo(2);
        String invoiceNumber = jdbc.queryForObject("SELECT invoice_number FROM billing_invoice WHERE id = ?", String.class, invoiceId);
        assertThat(invoiceNumber).startsWith("WEB-TEST-FY-");
        assertThat(jdbc.queryForObject("SELECT total_amount FROM billing_invoice WHERE id = ?", BigDecimal.class, invoiceId))
                .isEqualByComparingTo("335.00");
        assertThat(jdbc.queryForObject("SELECT promotion_discount_amount FROM billing_invoice WHERE id = ?", BigDecimal.class, invoiceId))
                .isEqualByComparingTo("30.00");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_invoice_line WHERE invoice_id = ?",
                Long.class, invoiceId)).isEqualTo(4); // two product lines plus shipping and gift wrapping
        assertThat(jdbc.queryForObject("""
                SELECT COUNT(*) FROM billing_invoice_delivery_consent WHERE invoice_id = ?
                """, Long.class, invoiceId)).isZero(); // an order email address is not delivery consent
        assertThat(jdbc.queryForObject("""
                SELECT job_status FROM billing_online_invoice_job WHERE order_id = ?
                """, String.class, order.getId())).isEqualTo("COMPLETED");
        assertThat(onlineInvoiceJobs.discoverEligibleOrders(100)).isZero();
        assertThat(onlineInvoiceJobs.claimDue(20)).isEmpty();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_invoice WHERE source_type = 'ONLINE_ORDER' AND source_id = ?",
                Long.class, order.getId())).isEqualTo(1);

        var invoicePage = billingReporting.invoiceHistory(invoiceNumber, null, "ONLINE", null, null, 20, 0);
        assertThat(invoicePage.content()).anyMatch(row -> row.id() == invoiceId && row.orderNumber().equals(order.getOrderNumber()));
        var report = billingReporting.summary(java.time.LocalDate.now(java.time.ZoneOffset.UTC),
                java.time.LocalDate.now(java.time.ZoneOffset.UTC));
        assertThat(report.onlineSales()).isGreaterThanOrEqualTo(new BigDecimal("335.00"));
        assertThat(report.onlineDiscounts()).isGreaterThanOrEqualTo(new BigDecimal("30.00"));
    }

    @Test
    void onlineInvoicePollingExcludesPendingCancelledRefundedAndUnknownRefundOrders() {
        Fixture fixture = fixture("online-ineligible", 2, 2);
        Order unpaid = onlineOrder(fixture, PaymentStatus.PENDING, OrderStatus.CONFIRMED, RefundStatus.NOT_REQUIRED);
        Order cancelled = onlineOrder(fixture, PaymentStatus.PAID, OrderStatus.CANCELLED, RefundStatus.REFUND_REQUIRED);
        Order refunded = onlineOrder(fixture, PaymentStatus.PAID, OrderStatus.CONFIRMED, RefundStatus.REFUNDED);
        Order unknownRefund = onlineOrder(fixture, PaymentStatus.PAID, OrderStatus.CONFIRMED, null);
        onlineInvoiceJobs.discoverEligibleOrders(100);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_online_invoice_job WHERE order_id IN (?, ?, ?, ?)",
                Long.class, unpaid.getId(), cancelled.getId(), refunded.getId(), unknownRefund.getId())).isZero();
    }

    @Test
    void onlineInvoiceRetryAndExpiredLeaseRecoverAfterWorkerRestart() {
        Fixture fixture = fixture("online-recovery", 2, 2);
        Order order = paidOnlineOrder(fixture);
        onlineInvoiceJobs.discoverEligibleOrders(100);

        OnlineInvoiceJob first = onlineInvoiceJobs.claimDue(20).stream()
                .filter(job -> job.orderId() == order.getId()).findFirst().orElseThrow();
        assertThat(first.attemptNumber()).isEqualTo(1);
        onlineInvoiceJobs.fail(first, "TRANSIENT_TEST_FAILURE", "Synthetic provider-independent test failure",
                Instant.now().minusSeconds(2), false);
        assertThat(jdbc.queryForObject("SELECT job_status FROM billing_online_invoice_job WHERE id = ?",
                String.class, first.id())).isEqualTo("RETRY_WAIT");

        OnlineInvoiceJob second = onlineInvoiceJobs.claimDue(20).stream()
                .filter(job -> job.orderId() == order.getId()).findFirst().orElseThrow();
        assertThat(second.attemptNumber()).isEqualTo(2);
        // Simulate process termination after claim; the next worker observes the expired lease.
        jdbc.update("UPDATE billing_online_invoice_job SET processing_started_at = CURRENT_TIMESTAMP - INTERVAL '4 minutes' WHERE id = ?",
                second.id());
        OnlineInvoiceJob afterRestart = onlineInvoiceJobs.claimDue(20).stream()
                .filter(job -> job.orderId() == order.getId()).findFirst().orElseThrow();
        assertThat(afterRestart.attemptNumber()).isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT outcome FROM billing_online_invoice_job_attempt WHERE job_id = ? AND attempt_number = 2",
                String.class, first.id())).isEqualTo("RETRY_WAIT");
        assertThat(jdbc.queryForObject("SELECT error_code FROM billing_online_invoice_job_attempt WHERE job_id = ? AND attempt_number = 2",
                String.class, first.id())).isEqualTo("WORKER_LEASE_EXPIRED");

        onlineInvoiceGeneration.process(afterRestart);
        assertThat(jdbc.queryForObject("SELECT job_status FROM billing_online_invoice_job WHERE id = ?",
                String.class, first.id())).isEqualTo("COMPLETED");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_invoice WHERE source_type = 'ONLINE_ORDER' AND source_id = ?",
                Long.class, order.getId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_online_invoice_job_attempt WHERE job_id = ?",
                Long.class, first.id())).isEqualTo(3);
    }

    @Test
    void concurrentOnlineInvoiceWorkersClaimAJobOnlyOnce() throws Exception {
        Fixture fixture = fixture("online-worker-race", 2, 2);
        Order order = paidOnlineOrder(fixture);
        onlineInvoiceJobs.discoverEligibleOrders(100);

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            Future<List<OnlineInvoiceJob>> first = executor.submit(() -> {
                start.await();
                return onlineInvoiceJobs.claimDue(1);
            });
            Future<List<OnlineInvoiceJob>> second = executor.submit(() -> {
                start.await();
                return onlineInvoiceJobs.claimDue(1);
            });
            start.countDown();
            List<OnlineInvoiceJob> firstClaims = first.get();
            List<OnlineInvoiceJob> secondClaims = second.get();
            assertThat(firstClaims.size() + secondClaims.size()).isEqualTo(1);
            OnlineInvoiceJob claimed = java.util.stream.Stream.concat(firstClaims.stream(), secondClaims.stream())
                    .filter(job -> job.orderId() == order.getId()).findFirst().orElseThrow();
            onlineInvoiceGeneration.process(claimed);
        } finally {
            executor.shutdownNow();
        }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_invoice WHERE source_type = 'ONLINE_ORDER' AND source_id = ?",
                Long.class, order.getId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT job_status FROM billing_online_invoice_job WHERE order_id = ?",
                String.class, order.getId())).isEqualTo("COMPLETED");
    }

    @Test
    void deliveryQueueDeduplicatesAnInvoiceChannelAndHonorsIndependentConsent() {
        Fixture fixture = fixture("delivery-idempotency", 2, 0);
        PosQuoteRequest quoteRequest = request(fixture, 1, null, null);
        PosQuoteResponse quote = quoteService.quote(quoteRequest, admin);
        PosSaleFinalizeResponse sale = finalizeWithQuote("delivery-idempotency-key01", quoteRequest, quote,
                TenderMethod.CASH, "100.00", null);

        invoiceDeliveryRepository.saveConsent(sale.invoiceId(), InvoiceDeliveryChannel.EMAIL,
                "delivery@example.test", InvoiceConsentStatus.GRANTED, "test-email-consent-v1", admin.userId());
        var first = invoiceDeliveryRepository.enqueue(sale.invoiceId(), InvoiceDeliveryChannel.EMAIL,
                admin.userId(), "email-delivery-key-0001");
        var sameKey = invoiceDeliveryRepository.enqueue(sale.invoiceId(), InvoiceDeliveryChannel.EMAIL,
                admin.userId(), "email-delivery-key-0001");
        var secondKey = invoiceDeliveryRepository.enqueue(sale.invoiceId(), InvoiceDeliveryChannel.EMAIL,
                admin.userId(), "email-delivery-key-0002");
        assertThat(sameKey.id()).isEqualTo(first.id());
        assertThat(secondKey.id()).isEqualTo(first.id());
        assertThat(first.status()).isEqualTo(InvoiceDeliveryStatus.PENDING);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_invoice_delivery WHERE invoice_id = ? AND channel = 'EMAIL'",
                Long.class, sale.invoiceId())).isEqualTo(1);

        var noWhatsAppConsent = invoiceDeliveryRepository.enqueue(sale.invoiceId(), InvoiceDeliveryChannel.WHATSAPP,
                admin.userId(), "whatsapp-delivery-key01");
        assertThat(noWhatsAppConsent.status()).isEqualTo(InvoiceDeliveryStatus.SKIPPED_NO_CONSENT);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_invoice_delivery WHERE invoice_id = ? AND channel = 'WHATSAPP'",
                Long.class, sale.invoiceId())).isEqualTo(1);
    }

    @Test
    void invoiceAndPosHistoryApplyFiltersAndServerSidePagination() {
        Fixture fixture = fixture("report-pagination", 5, 0);
        String customerName = "Synthetic report customer " + UUID.randomUUID();
        PosQuoteRequest cashRequest = new PosQuoteRequest(List.of(line("report-cash", fixture, 1)), null,
                List.of(), List.of(), customerName, null, null);
        PosQuoteResponse cashQuote = quoteService.quote(cashRequest, admin);
        PosSaleFinalizeResponse cashSale = finalizeWithQuote("report-cash-key0000001", cashRequest, cashQuote,
                TenderMethod.CASH, "100.00", null);

        PosQuoteRequest upiRequest = new PosQuoteRequest(List.of(line("report-upi", fixture, 1)), null,
                List.of(), List.of(), customerName, null, null);
        PosQuoteResponse upiQuote = quoteService.quote(upiRequest, admin);
        PosSaleFinalizeResponse upiSale = finalizeWithQuote("report-upi-key00000001", upiRequest, upiQuote,
                TenderMethod.UPI, "100.00", "synthetic-transaction-reference");

        var firstInvoicePage = billingReporting.invoiceHistory(customerName,
                com.alahadattars.billing.invoice.InvoiceChannel.POS, null, null, null, 1, 0);
        var secondInvoicePage = billingReporting.invoiceHistory(customerName,
                com.alahadattars.billing.invoice.InvoiceChannel.POS, null, null, null, 1, 1);
        assertThat(firstInvoicePage.totalElements()).isEqualTo(2);
        assertThat(firstInvoicePage.content()).hasSize(1);
        assertThat(secondInvoicePage.totalElements()).isEqualTo(2);
        assertThat(secondInvoicePage.content()).hasSize(1);
        assertThat(firstInvoicePage.content().get(0).id()).isNotEqualTo(secondInvoicePage.content().get(0).id());

        var upiInvoices = billingReporting.invoiceHistory(customerName,
                com.alahadattars.billing.invoice.InvoiceChannel.POS, "UPI", null, null, 10, 0);
        assertThat(upiInvoices.totalElements()).isEqualTo(1);
        assertThat(upiInvoices.content()).extracting(record -> record.tenderMethod()).containsExactly("UPI");

        var filteredSales = billingReporting.posSales(upiSale.invoiceNumber(), "UPI", null, null, 10, 0);
        assertThat(filteredSales.totalElements()).isEqualTo(1);
        assertThat(filteredSales.content()).extracting(record -> record.saleId()).containsExactly(upiSale.saleId());
        var cashSales = billingReporting.posSales(cashSale.invoiceNumber(), "CASH", null, null, 10, 0);
        assertThat(cashSales.totalElements()).isEqualTo(1);
        assertThat(cashSales.content()).extracting(record -> record.saleId()).containsExactly(cashSale.saleId());
    }

    private Order paidOnlineOrder(Fixture fixture) {
        Address address = saveTestAddress();
        Order order = Order.builder().orderNumber("ONLINE-" + UUID.randomUUID().toString().substring(0, 10))
                .shippingAddress(address).status(OrderStatus.CONFIRMED).paymentStatus(PaymentStatus.PAID)
                .refundStatus(RefundStatus.NOT_REQUIRED).paymentMethod("ONLINE")
                .transactionId("rzp-test-" + UUID.randomUUID())
                .guestName("Synthetic Online Customer").guestEmail("synthetic@example.test")
                .guestPhone("+919876543210").totalAmount(new BigDecimal("335.00"))
                .shippingCost(new BigDecimal("50.00")).offerDiscountAmount(new BigDecimal("10.00"))
                .couponDiscountAmount(new BigDecimal("20.00")).giftServicePrice(new BigDecimal("10.00"))
                .isGiftWrapped(true).build();
        timestamps(order);
        OrderItem bottleLine = OrderItem.builder().order(order).variant(fixture.variant()).isGiftSet(false)
                .quantity(1).originalPrice(new BigDecimal("100.00")).discountAmount(new BigDecimal("10.00"))
                .unitPrice(new BigDecimal("95.00")).subtotal(new BigDecimal("95.00"))
                .productName(fixture.product().getName()).variantSize(fixture.variant().getSize())
                .bottleId(fixture.bottle().getId()).bottleName(fixture.bottle().getName())
                .bottlePrice(new BigDecimal("5.00")).freeItem(false).build();
        timestamps(bottleLine);
        OrderItem secondLine = OrderItem.builder().order(order).variant(fixture.variant()).isGiftSet(false)
                .quantity(2).originalPrice(new BigDecimal("100.00")).discountAmount(BigDecimal.ZERO)
                .unitPrice(new BigDecimal("100.00")).subtotal(new BigDecimal("200.00"))
                .productName(fixture.product().getName()).variantSize(fixture.variant().getSize())
                .bottlePrice(BigDecimal.ZERO).freeItem(false).build();
        timestamps(secondLine);
        order.addItem(bottleLine);
        order.addItem(secondLine);
        return orderRepository.saveAndFlush(order);
    }

    private Order onlineOrder(Fixture fixture, PaymentStatus payment, OrderStatus status, RefundStatus refund) {
        Address address = saveTestAddress();
        Order order = Order.builder().orderNumber("ONLINE-" + UUID.randomUUID().toString().substring(0, 10))
                .shippingAddress(address).status(status).paymentStatus(payment).refundStatus(refund)
                .paymentMethod("ONLINE").transactionId("rzp-test-" + UUID.randomUUID())
                .guestEmail("synthetic@example.test").totalAmount(new BigDecimal("105.00"))
                .shippingCost(BigDecimal.ZERO).offerDiscountAmount(BigDecimal.ZERO)
                .couponDiscountAmount(BigDecimal.ZERO).giftServicePrice(BigDecimal.ZERO).build();
        timestamps(order);
        OrderItem line = OrderItem.builder().order(order).variant(fixture.variant()).isGiftSet(false)
                .quantity(1).originalPrice(new BigDecimal("100.00")).discountAmount(BigDecimal.ZERO)
                .unitPrice(new BigDecimal("105.00")).subtotal(new BigDecimal("105.00"))
                .productName(fixture.product().getName()).variantSize(fixture.variant().getSize())
                .bottleId(fixture.bottle().getId()).bottleName(fixture.bottle().getName())
                .bottlePrice(new BigDecimal("5.00")).freeItem(false).build();
        timestamps(line);
        order.addItem(line);
        return orderRepository.saveAndFlush(order);
    }

    private Address saveTestAddress() {
        Address address = Address.builder().fullName("Synthetic Test Customer").phone("+919876543210")
                .addressLine1("Test street").city("Mumbai").state("Maharashtra")
                .postalCode("400001").country("India").active(true).build();
        timestamps(address);
        return addressRepository.saveAndFlush(address);
    }

    @Test
    void variantShortageRejectsWithoutCreatingPartialSale() {
        long salesBefore = countSales();
        long invoicesBefore = countInvoices();
        Fixture fixture = fixture("variant-short", 1, 5);
        PosQuoteRequest quoteRequest = request(fixture, 2, null, null);
        PosQuoteResponse quote = quoteService.quote(quoteRequest, admin);
        assertThat(quote.allLinesAvailable()).isFalse();

        assertThatThrownBy(() -> finalizeWithQuote("variant-shortage-key01", quoteRequest, quote,
                TenderMethod.UPI, quote.payableAmount().toPlainString(), "upi-ref"))
                .isInstanceOf(ConflictException.class);
        assertThat(stock(fixture.variant().getId())).isEqualTo(1);
        assertThat(countSales()).isEqualTo(salesBefore);
        assertThat(countInvoices()).isEqualTo(invoicesBefore);
    }

    @Test
    void failureAfterVariantDecrementRollsBackVariantAndBottleAndBillingWrites() {
        long salesBefore = countSales();
        long invoicesBefore = countInvoices();
        Fixture fixture = fixture("bottle-race", 2, 2);
        PosQuoteRequest quoteRequest = request(fixture, 1, null, null);
        PosQuoteResponse quote = quoteService.quote(quoteRequest, admin);
        installBottleLossTrigger(fixture.variant().getId(), fixture.bottle().getId());
        try {
            assertThatThrownBy(() -> finalizeWithQuote("bottle-race-failure-001", quoteRequest, quote,
                    TenderMethod.CASH, "105.00", null)).isInstanceOf(RuntimeException.class);
        } finally {
            removeBottleLossTrigger();
        }
        assertThat(stock(fixture.variant().getId())).isEqualTo(2);
        assertThat(bottleStock(fixture.bottle().getId())).isEqualTo(2);
        assertThat(countSales()).isEqualTo(salesBefore);
        assertThat(countInvoices()).isEqualTo(invoicesBefore);
    }

    @Test
    void concurrentSalesCompetingForLastVariantStockCannotOversell() throws Exception {
        long salesBefore = countSales();
        Fixture fixture = fixture("variant-last", 1, 5);
        PosQuoteRequest quoteRequest = request(fixture, 1, null, null);
        PosQuoteResponse quote = quoteService.quote(quoteRequest, admin);
        List<Attempt> attempts = race(() -> finalizeWithQuote("variant-race-key-0001", quoteRequest, quote,
                        TenderMethod.CASH, "105.00", null),
                () -> finalizeWithQuote("variant-race-key-0002", quoteRequest, quote,
                        TenderMethod.CASH, "105.00", null));
        assertOneSaleOneRejected(attempts);
        assertThat(stock(fixture.variant().getId())).isZero();
        assertThat(countSales()).isEqualTo(salesBefore + 1);
    }

    @Test
    void concurrentSalesCompetingForLastBottleStockCannotOversell() throws Exception {
        long salesBefore = countSales();
        Bottle bottle = bottle("last-bottle", 1);
        Fixture left = fixtureWithBottle("bottle-left", 1, bottle);
        Fixture right = fixtureWithBottle("bottle-right", 1, bottle);
        PosQuoteRequest leftRequest = request(left, 1, null, null);
        PosQuoteRequest rightRequest = request(right, 1, null, null);
        PosQuoteResponse leftQuote = quoteService.quote(leftRequest, admin);
        PosQuoteResponse rightQuote = quoteService.quote(rightRequest, admin);
        List<Attempt> attempts = race(() -> finalizeWithQuote("bottle-race-key-00001", leftRequest, leftQuote,
                        TenderMethod.CASH, "105.00", null),
                () -> finalizeWithQuote("bottle-race-key-00002", rightRequest, rightQuote,
                        TenderMethod.CASH, "105.00", null));
        assertOneSaleOneRejected(attempts);
        assertThat(bottleStock(bottle.getId())).isZero();
        assertThat(countSales()).isEqualTo(salesBefore + 1);
    }

    @Test
    void duplicateProductLinesAggregateVariantAndBottleDemand() {
        Fixture fixture = fixture("duplicate-lines", 3, 3);
        PosQuoteRequest quoteRequest = new PosQuoteRequest(List.of(
                line("duplicate-a", fixture, 1), line("duplicate-b", fixture, 1)), null,
                List.of(), List.of(), null, null, null);
        PosQuoteResponse quote = quoteService.quote(quoteRequest, admin);
        PosSaleFinalizeResponse response = finalizeWithQuote("duplicate-lines-key0001", quoteRequest, quote,
                TenderMethod.CASH, "210.00", null);

        assertThat(stock(fixture.variant().getId())).isEqualTo(1);
        assertThat(bottleStock(fixture.bottle().getId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_pos_sale_line WHERE sale_id = ?", Long.class, response.saleId())).isEqualTo(2);
    }

    @Test
    void concurrentDuplicateRequestReturnsOneOriginalSaleAndDeductsOnce() throws Exception {
        long salesBefore = countSales();
        Fixture fixture = fixture("duplicate-idem", 2, 2);
        PosQuoteRequest quoteRequest = request(fixture, 1, null, null);
        PosQuoteResponse quote = quoteService.quote(quoteRequest, admin);
        Callable<PosSaleFinalizeResponse> submit = () -> finalizeWithQuote("same-idempotency-key-01", quoteRequest,
                quote, TenderMethod.CASH, "105.00", null);
        List<Attempt> attempts = race(submit, submit);

        assertThat(attempts).filteredOn(Attempt::succeeded).hasSize(2);
        List<PosSaleFinalizeResponse> responses = attempts.stream().map(Attempt::response).toList();
        assertThat(responses).extracting(PosSaleFinalizeResponse::saleId).containsOnly(responses.getFirst().saleId());
        assertThat(responses).extracting(PosSaleFinalizeResponse::replayed).containsExactlyInAnyOrder(false, true);
        assertThat(stock(fixture.variant().getId())).isEqualTo(1);
        assertThat(bottleStock(fixture.bottle().getId())).isEqualTo(1);
        assertThat(countSales()).isEqualTo(salesBefore + 1);
    }

    @Test
    void idempotencyKeyWithDifferentPayloadReturnsConflict() {
        long salesBefore = countSales();
        Fixture fixture = fixture("idem-diff", 5, 5);
        PosQuoteRequest originalRequest = request(fixture, 1, null, null);
        PosQuoteResponse originalQuote = quoteService.quote(originalRequest, admin);
        finalizeWithQuote("different-payload-key01", originalRequest, originalQuote,
                TenderMethod.CASH, "105.00", null);

        PosQuoteRequest changedRequest = request(fixture, 2, null, null);
        PosQuoteResponse changedQuote = quoteService.quote(changedRequest, admin);
        assertThatThrownBy(() -> finalizeWithQuote("different-payload-key01", changedRequest, changedQuote,
                TenderMethod.CASH, "210.00", null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("different request");
        assertThat(stock(fixture.variant().getId())).isEqualTo(4);
        assertThat(countSales()).isEqualTo(salesBefore + 1);
    }

    @Test
    void concurrentGlobalPromotionClaimsDoNotExceedLimit() throws Exception {
        long salesBefore = countSales();
        Fixture left = fixture("promo-left", 2, 2);
        Fixture right = fixture("promo-right", 2, 2);
        Promotion promotion = cartPromotion("limit-one", 1, 0, 0);
        PosQuoteRequest leftRequest = request(left, 1, promotion.getCode(), null);
        PosQuoteRequest rightRequest = request(right, 1, promotion.getCode(), null);
        PosQuoteResponse leftQuote = quoteService.quote(leftRequest, admin);
        PosQuoteResponse rightQuote = quoteService.quote(rightRequest, admin);

        List<Attempt> attempts = race(() -> finalizeWithQuote("global-promo-key-0001", leftRequest, leftQuote,
                        TenderMethod.CASH, leftQuote.payableAmount().toPlainString(), null),
                () -> finalizeWithQuote("global-promo-key-0002", rightRequest, rightQuote,
                        TenderMethod.CASH, rightQuote.payableAmount().toPlainString(), null));

        assertOneSaleOneRejected(attempts);
        assertThat(promotionRepository.findById(promotion.getId()).orElseThrow().getUsedCount()).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM promotion_redemption WHERE promotion_id = ? AND pos_sale_id IS NOT NULL", Long.class, promotion.getId())).isEqualTo(1);
        assertThat(countSales()).isEqualTo(salesBefore + 1);
    }

    @Test
    void failureAfterPromotionClaimRollsBackStockRedemptionAndSale() {
        long salesBefore = countSales();
        long invoicesBefore = countInvoices();
        Fixture fixture = fixture("promo-rollback", 2, 2);
        Promotion promotion = cartPromotion("rollback", 5, 0, 0);
        PosQuoteRequest quoteRequest = request(fixture, 1, promotion.getCode(), null);
        PosQuoteResponse quote = quoteService.quote(quoteRequest, admin);
        installInvoiceFailureTrigger();
        try {
            assertThatThrownBy(() -> finalizeWithQuote("promotion-rollback-key01", quoteRequest, quote,
                    TenderMethod.CASH, quote.payableAmount().toPlainString(), null)).isInstanceOf(RuntimeException.class);
        } finally {
            removeInvoiceFailureTrigger();
        }
        assertThat(stock(fixture.variant().getId())).isEqualTo(2);
        assertThat(bottleStock(fixture.bottle().getId())).isEqualTo(2);
        assertThat(promotionRepository.findById(promotion.getId()).orElseThrow().getUsedCount()).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM promotion_redemption WHERE promotion_id = ? AND pos_sale_id IS NOT NULL", Long.class, promotion.getId())).isZero();
        assertThat(countSales()).isEqualTo(salesBefore);
        assertThat(countInvoices()).isEqualTo(invoicesBefore);
    }

    @Test
    void perCustomerLimitedPromotionIsExcludedAndNotRedeemed() {
        Fixture fixture = fixture("per-user", 2, 2);
        Promotion promotion = cartPromotion("per-user", null, 0, 1);
        PosQuoteRequest quoteRequest = request(fixture, 1, promotion.getCode(), null);
        PosQuoteResponse quote = quoteService.quote(quoteRequest, admin);
        assertThat(quote.appliedPromotions()).extracting(PosQuoteResponse.PromotionSummary::id).doesNotContain(promotion.getId());
        PosSaleFinalizeResponse response = finalizeWithQuote("per-user-exclusion-key01", quoteRequest, quote,
                TenderMethod.CASH, quote.payableAmount().toPlainString(), null);

        assertThat(response.promotionDiscount()).isEqualByComparingTo("0.00");
        assertThat(promotionRepository.findById(promotion.getId()).orElseThrow().getUsedCount()).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM promotion_redemption WHERE promotion_id = ?", Long.class, promotion.getId())).isZero();
    }

    @Test
    void selectedFreeRewardPersistsAndDeductsVariantStock() {
        Fixture paid = fixture("free-buy", 3, 0);
        Fixture reward = fixture("free-reward", 2, 0);
        Promotion promotion = freeProductPromotion("free-reward", paid.variant().getId(), reward.variant().getId());
        PosQuoteRequest quoteRequest = new PosQuoteRequest(List.of(line("paid-line", paid, 1)), promotion.getCode(),
                List.of(), List.of(new PosQuoteRequest.FreeReward(promotion.getId(), reward.variant().getId())),
                null, null, null);
        PosQuoteResponse quote = quoteService.quote(quoteRequest, admin);
        assertThat(quote.lines()).hasSize(2);
        assertThat(quote.lines()).anySatisfy(line -> {
            if (line.freeItem()) {
                assertThat(line.finalLineTotal()).isEqualByComparingTo("0.00");
                assertThat(line.freePromotionId()).isEqualTo(promotion.getId());
            }
        });
        PosSaleFinalizeResponse response = finalizeWithQuote("free-reward-stock-key01", quoteRequest, quote,
                TenderMethod.CASH, quote.payableAmount().toPlainString(), null);

        assertThat(stock(paid.variant().getId())).isEqualTo(2);
        assertThat(stock(reward.variant().getId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_pos_sale_line WHERE sale_id = ? AND is_free_item = TRUE AND free_promotion_id = ?", Long.class, response.saleId(), promotion.getId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_invoice_line WHERE invoice_id = ? AND is_free_item = TRUE AND free_promotion_id = ?", Long.class, response.invoiceId(), promotion.getId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM promotion_redemption WHERE pos_sale_id = ? AND promotion_id = ?", Long.class, response.saleId(), promotion.getId())).isEqualTo(1);
    }

    private PosSaleFinalizeResponse finalizeWithQuote(String key, PosQuoteRequest quoteRequest,
                                                      PosQuoteResponse quote, com.alahadattars.billing.sale.TenderMethod method,
                                                      String received, String reference) {
        PosSaleFinalizeRequest request = new PosSaleFinalizeRequest(quoteRequest,
                new PosSaleFinalizeRequest.Tender(method, new BigDecimal(received), reference), quote.quoteFingerprint());
        return finalizationService.finalizeSale(key, request, admin);
    }

    private PosQuoteRequest request(Fixture fixture, int quantity, String coupon,
                                    PosQuoteRequest.ManualDiscount discount) {
        return new PosQuoteRequest(List.of(line("line-" + UUID.randomUUID().toString().substring(0, 8), fixture, quantity)),
                coupon, discount == null ? List.of() : List.of(discount), List.of(), null, null, null);
    }

    private static PosQuoteRequest.Line line(String key, Fixture fixture, int quantity) {
        return new PosQuoteRequest.Line(key, fixture.product().getId(), fixture.variant().getId(),
                fixture.bottle() == null ? null : fixture.bottle().getId(), quantity);
    }

    private Fixture fixture(String label, int variantStock, int bottleStock) {
        Bottle bottle = bottleStock <= 0 ? null : bottle(label, bottleStock);
        return fixtureWithBottle(label, variantStock, bottle);
    }

    private Fixture fixtureWithBottle(String label, int variantStock, Bottle bottle) {
        String suffix = label + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        LocalDateTime now = LocalDateTime.now();
        Category category = Category.builder().name("POS " + suffix).description("Synthetic test category")
                .image("test").type(CategoryType.ATTARS).active(true).build();
        timestamps(category);
        category = categoryRepository.saveAndFlush(category);
        Product product = Product.builder().name("POS product " + suffix).slug("pos-" + suffix)
                .shortDescription("test").description("Synthetic test product").brand("Test")
                .category(category).fragranceFamily("test").topNotes("test").middleNotes("test")
                .baseNotes("test").longevity("test").projection("test").gender(Gender.UNISEX)
                .active(true).build();
        timestamps(product);
        product = productRepository.saveAndFlush(product);
        ProductVariant variant = ProductVariant.builder().product(product).productType(ProductType.GENERAL)
                .size("10 ml").price(new BigDecimal("100.00")).discountedPrice(new BigDecimal("1.00"))
                .stock(variantStock).sku("POS-" + suffix).active(true).build();
        timestamps(variant);
        variant = variantRepository.saveAndFlush(variant);
        return new Fixture(product, variant, bottle);
    }

    private Bottle bottle(String label, int stock) {
        Bottle bottle = Bottle.builder().name("POS bottle " + label + " " + UUID.randomUUID().toString().substring(0, 8))
                .price(new BigDecimal("5.00")).stockQuantity(stock).active(true)
                .applicability(BottleApplicability.BOTH).build();
        timestamps(bottle);
        return bottleRepository.saveAndFlush(bottle);
    }

    private Promotion cartPromotion(String label, Integer usageLimit, int usedCount, Integer perUserLimit) {
        Promotion promotion = Promotion.builder().name("POS cart promo " + label + " " + UUID.randomUUID().toString().substring(0, 6))
                .code("P" + UUID.randomUUID().toString().replace("-", "").substring(0, 20).toUpperCase())
                .promotionType(PromotionType.CART_DISCOUNT).discountType(DiscountType.PERCENTAGE)
                .discountValue(new BigDecimal("10.00")).usageLimit(usageLimit).usedCount(usedCount)
                .perUserLimit(perUserLimit).priority(10).active(true).stackable(false).build();
        timestamps(promotion);
        return promotionRepository.saveAndFlush(promotion);
    }

    private Promotion freeProductPromotion(String label, Long buyVariantId, Long freeVariantId) {
        PromotionConfiguration configuration = PromotionConfiguration.builder()
                .buyVariantIds(List.of(buyVariantId)).minPurchaseQuantity(1)
                .freeVariantIds(List.of(freeVariantId)).maxFreeQuantity(1).build();
        Promotion promotion = Promotion.builder().name("POS free promo " + label + " " + UUID.randomUUID().toString().substring(0, 6))
                .code("F" + UUID.randomUUID().toString().replace("-", "").substring(0, 20).toUpperCase())
                .promotionType(PromotionType.FREE_PRODUCT).discountType(DiscountType.FREE_ITEM)
                .usageLimit(10).usedCount(0).priority(10).active(true).stackable(false)
                .configuration(configuration).build();
        timestamps(promotion);
        return promotionRepository.saveAndFlush(promotion);
    }

    private void installBottleLossTrigger(Long variantId, Long bottleId) {
        jdbc.execute("CREATE FUNCTION gate2_zero_bottle_after_variant_decrement() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN "
                + "IF NEW.id = " + variantId + " AND NEW.stock < OLD.stock THEN UPDATE bottle SET stock_quantity = 0 WHERE id = " + bottleId + "; END IF; "
                + "RETURN NEW; END; $$");
        jdbc.execute("CREATE TRIGGER gate2_zero_bottle_after_variant_decrement AFTER UPDATE OF stock ON product_variant "
                + "FOR EACH ROW WHEN (NEW.stock < OLD.stock) EXECUTE FUNCTION gate2_zero_bottle_after_variant_decrement()");
    }

    private void removeBottleLossTrigger() {
        jdbc.execute("DROP TRIGGER IF EXISTS gate2_zero_bottle_after_variant_decrement ON product_variant");
        jdbc.execute("DROP FUNCTION IF EXISTS gate2_zero_bottle_after_variant_decrement()");
    }

    private void installInvoiceFailureTrigger() {
        jdbc.execute("CREATE FUNCTION gate2_fail_pos_invoice_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN "
                + "RAISE EXCEPTION 'intentional isolated POS rollback test'; END; $$");
        jdbc.execute("CREATE TRIGGER gate2_fail_pos_invoice_insert BEFORE INSERT ON billing_invoice "
                + "FOR EACH ROW WHEN (NEW.invoice_channel = 'POS') EXECUTE FUNCTION gate2_fail_pos_invoice_insert()");
    }

    private void removeInvoiceFailureTrigger() {
        jdbc.execute("DROP TRIGGER IF EXISTS gate2_fail_pos_invoice_insert ON billing_invoice");
        jdbc.execute("DROP FUNCTION IF EXISTS gate2_fail_pos_invoice_insert()");
    }

    private List<Attempt> race(Callable<PosSaleFinalizeResponse> first, Callable<PosSaleFinalizeResponse> second) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            Future<Attempt> a = executor.submit(() -> attempt(start, first));
            Future<Attempt> b = executor.submit(() -> attempt(start, second));
            start.countDown();
            return List.of(a.get(), b.get());
        } finally {
            executor.shutdownNow();
        }
    }

    private static Attempt attempt(CountDownLatch start, Callable<PosSaleFinalizeResponse> callable) throws Exception {
        start.await();
        try {
            return new Attempt(callable.call(), null);
        } catch (Throwable error) {
            return new Attempt(null, error);
        }
    }

    private static void assertOneSaleOneRejected(List<Attempt> attempts) {
        assertThat(attempts).filteredOn(Attempt::succeeded).hasSize(1);
        assertThat(attempts).filteredOn(attempt -> !attempt.succeeded()).hasSize(1);
        assertThat(attempts.stream().filter(attempt -> !attempt.succeeded()).findFirst().orElseThrow().error())
                .isInstanceOfAny(PosQuoteChangedException.class, ConflictException.class);
    }

    private int stock(Long variantId) {
        return jdbc.queryForObject("SELECT stock FROM product_variant WHERE id = ?", Integer.class, variantId);
    }

    private int bottleStock(Long bottleId) {
        return jdbc.queryForObject("SELECT stock_quantity FROM bottle WHERE id = ?", Integer.class, bottleId);
    }

    private long countSales() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM billing_pos_sale", Long.class);
    }

    private long countInvoices() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM billing_invoice", Long.class);
    }

    private static void timestamps(com.alahadattars.entity.BaseEntity entity) {
        LocalDateTime now = LocalDateTime.now();
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
    }

    @Configuration(proxyBeanMethods = false)
    @EnableAutoConfiguration
    @EnableTransactionManagement
    @EnableJpaAuditing
    @EntityScan(basePackages = "com.alahadattars.entity")
    @EnableJpaRepositories(basePackages = "com.alahadattars.repository")
    @Import({PosQuoteService.class, PosSaleJdbcRepository.class, PosSaleFinalizationService.class,
            PosSaleTransactionService.class, com.alahadattars.billing.discount.ManualDiscountCalculator.class,
            com.alahadattars.billing.invoice.InvoiceNumberAllocator.class,
            com.alahadattars.billing.invoice.InvoiceJdbcRepository.class,
            com.alahadattars.billing.invoice.InvoiceDocumentService.class,
            com.alahadattars.billing.invoice.InvoicePdfRenderer.class,
            com.alahadattars.billing.invoice.InvoiceWordingProvider.class,
            com.alahadattars.billing.delivery.InvoiceDeliveryJdbcRepository.class,
            com.alahadattars.billing.online.OnlineInvoiceJobJdbcRepository.class,
            com.alahadattars.billing.online.OnlineInvoiceGenerationService.class,
            com.alahadattars.billing.online.OnlineInvoiceConfiguration.class,
            com.alahadattars.billing.reporting.BillingReportingRepository.class,
            PosInvoiceConfiguration.class, PromotionEngineServiceImpl.class, ProductImageResolver.class,
            PromotionResponseMapper.class, EligibilityConditionFactory.class,
            LegacyCategoryDiscountCondition.class, LegacyProductDiscountCondition.class})
    static class JpaTestConfiguration {
        @Bean
        StorageService isolatedTestStorageService() {
            return new StorageService() {
                @Override public String uploadFile(org.springframework.web.multipart.MultipartFile file, String prefix) {
                    throw new UnsupportedOperationException("Storage is not used by POS finalization tests");
                }
                @Override public void deleteFile(String key) { }
                @Override public String publicUrl(String key) { return null; }
            };
        }
    }

    private record Fixture(Product product, ProductVariant variant, Bottle bottle) { }
    private record Attempt(PosSaleFinalizeResponse response, Throwable error) {
        boolean succeeded() { return response != null; }
    }
}
