package com.alahadattars.billing.pos;

import com.alahadattars.billing.sale.TenderMethod;
import com.alahadattars.billing.security.AuthenticatedBillingAdmin;
import com.alahadattars.exception.ConflictException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class PosSaleFinalizationServiceReconciliationTest {

    private PosSaleJdbcRepository repository;
    private PosSaleTransactionService transactionService;
    private PosSaleFinalizationService finalizationService;
    private AuthenticatedBillingAdmin admin;

    private static final String CLIENT_KEY = "client-idemp-key-12345678";
    private static final long ADMIN_ID = 101L;
    private static final String SCOPED_KEY = ADMIN_ID + ":" + CLIENT_KEY;

    private PosSaleFinalizeRequest finalizeRequest;
    private PosSaleFinalizeResponse committedResponse;

    @BeforeEach
    void setUp() {
        repository = mock(PosSaleJdbcRepository.class);
        transactionService = mock(PosSaleTransactionService.class);
        finalizationService = new PosSaleFinalizationService(repository, transactionService);
        admin = new AuthenticatedBillingAdmin(ADMIN_ID, "admin@alahadattars.com");

        finalizeRequest = new PosSaleFinalizeRequest(
                new PosQuoteRequest(
                        List.of(new PosQuoteRequest.Line("line-1", 1L, 10L, null, 1)),
                        null, List.of(), List.of(), "Customer Name", "9876543210", null
                ),
                new PosSaleFinalizeRequest.Tender(TenderMethod.CASH, new BigDecimal("500.00"), null),
                "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
        );

        committedResponse = new PosSaleFinalizeResponse(
                42L, UUID.randomUUID(), "COMPLETED", 99L, "POS-2026-27-000042",
                Instant.now(), finalizeRequest.confirmedQuoteFingerprint(),
                new BigDecimal("500.00"), BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("500.00"),
                TenderMethod.CASH, new BigDecimal("500.00"), BigDecimal.ZERO, new BigDecimal("500.00"), false
        );
    }

    @Test
    void finalizeSale_replaysCommittedSale_whenClientRetriesAfterResponseFailure() {
        // SCENARIO: Initial transaction committed in DB, but client experienced a response failure/timeout.
        // Client retries with the exact same idempotency key and request.
        String expectedHash = computeExpectedHash(finalizeRequest, ADMIN_ID);
        PosSaleJdbcRepository.ExistingSale existing = new PosSaleJdbcRepository.ExistingSale(
                expectedHash, ADMIN_ID, committedResponse
        );
        when(repository.findByIdempotencyKey(SCOPED_KEY)).thenReturn(Optional.of(existing));

        PosSaleFinalizeResponse result = finalizationService.finalizeSale(CLIENT_KEY, finalizeRequest, admin);

        assertThat(result).isNotNull();
        assertThat(result.saleId()).isEqualTo(42L);
        assertThat(result.invoiceNumber()).isEqualTo("POS-2026-27-000042");
        assertThat(result.replayed()).isTrue();

        // Transaction service MUST NOT be invoked again
        verify(transactionService, never()).finalizeInTransaction(any(), any(), any(), any());
    }

    @Test
    void reconcileSale_returnsCommitted_whenGatewayTimedOutAfterCommit() {
        // SCENARIO: Client received HTTP 504 / 503 gateway timeout after DB commit.
        // Frontend calls read-only reconcile endpoint to verify whether the sale committed.
        String expectedHash = computeExpectedHash(finalizeRequest, ADMIN_ID);
        PosSaleJdbcRepository.ExistingSale existing = new PosSaleJdbcRepository.ExistingSale(
                expectedHash, ADMIN_ID, committedResponse
        );
        when(repository.findByIdempotencyKey(SCOPED_KEY)).thenReturn(Optional.of(existing));

        PosSaleReconciliationResponse recon = finalizationService.reconcileSale(CLIENT_KEY, admin);

        assertThat(recon.status()).isEqualTo("COMMITTED");
        assertThat(recon.sale()).isNotNull();
        assertThat(recon.sale().saleId()).isEqualTo(42L);
        assertThat(recon.sale().invoiceNumber()).isEqualTo("POS-2026-27-000042");
    }

    @Test
    void reconcileSale_returnsNotFound_whenTransactionRolledBack() {
        // SCENARIO: Backend transaction rolled back or request never reached commit.
        // Reconcile returns NOT_FOUND so frontend knows transaction definitely did not commit.
        when(repository.findByIdempotencyKey(SCOPED_KEY)).thenReturn(Optional.empty());

        PosSaleReconciliationResponse recon = finalizationService.reconcileSale(CLIENT_KEY, admin);

        assertThat(recon.status()).isEqualTo("NOT_FOUND");
        assertThat(recon.sale()).isNull();
    }

    @Test
    void reconcileSale_isScopedToCallingAdmin() {
        // SCENARIO: Different admin attempts to reconcile another admin's client key.
        AuthenticatedBillingAdmin otherAdmin = new AuthenticatedBillingAdmin(999L, "other@alahadattars.com");
        String otherScopedKey = "999:" + CLIENT_KEY;

        when(repository.findByIdempotencyKey(otherScopedKey)).thenReturn(Optional.empty());

        PosSaleReconciliationResponse recon = finalizationService.reconcileSale(CLIENT_KEY, otherAdmin);
        assertThat(recon.status()).isEqualTo("NOT_FOUND");
    }

    @Test
    void finalizeSale_rejectsModifiedPayloadOnRetry() {
        // SCENARIO: Client retries with same idempotency key but modified line items or amount.
        String originalHash = computeExpectedHash(finalizeRequest, ADMIN_ID);
        PosSaleJdbcRepository.ExistingSale existing = new PosSaleJdbcRepository.ExistingSale(
                originalHash, ADMIN_ID, committedResponse
        );
        when(repository.findByIdempotencyKey(SCOPED_KEY)).thenReturn(Optional.of(existing));

        PosSaleFinalizeRequest tamperedRequest = new PosSaleFinalizeRequest(
                new PosQuoteRequest(
                        List.of(new PosQuoteRequest.Line("line-1", 1L, 10L, null, 5)), // quantity changed to 5
                        null, List.of(), List.of(), "Customer Name", "9876543210", null
                ),
                new PosSaleFinalizeRequest.Tender(TenderMethod.CASH, new BigDecimal("2500.00"), null),
                "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
        );

        assertThatThrownBy(() -> finalizationService.finalizeSale(CLIENT_KEY, tamperedRequest, admin))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already used with a different request");
    }

    private String computeExpectedHash(PosSaleFinalizeRequest request, long adminId) {
        // Invoke the private/package-private fingerprint method by calling through service
        try {
            var method = PosSaleFinalizationService.class.getDeclaredMethod("fingerprint", PosSaleFinalizeRequest.class, long.class);
            method.setAccessible(true);
            return (String) method.invoke(null, request, adminId);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
