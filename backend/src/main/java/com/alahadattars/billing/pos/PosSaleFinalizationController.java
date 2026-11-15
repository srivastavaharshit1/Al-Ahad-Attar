package com.alahadattars.billing.pos;

import com.alahadattars.billing.security.AuthenticatedBillingAdmin;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@PreAuthorize("hasRole('ADMIN')")
@RequestMapping("/api/billing/pos/sales")
public class PosSaleFinalizationController {
    private final PosSaleFinalizationService finalizationService;

    public PosSaleFinalizationController(PosSaleFinalizationService finalizationService) {
        this.finalizationService = finalizationService;
    }

    @PostMapping("/finalize")
    public ResponseEntity<?> finalizeSale(Authentication authentication,
                                          @RequestHeader("Idempotency-Key") String idempotencyKey,
                                          @Valid @RequestBody PosSaleFinalizeRequest request) {
        try {
            PosSaleFinalizeResponse response = finalizationService.finalizeSale(idempotencyKey, request,
                    AuthenticatedBillingAdmin.from(authentication));
            return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(response);
        } catch (PosQuoteChangedException changed) {
            return ResponseEntity.status(HttpStatus.CONFLICT).cacheControl(CacheControl.noStore())
                    .body(new PosQuoteChangedResponse("QUOTE_CHANGED", changed.getMessage(), changed.updatedQuote()));
        }
    }

    @GetMapping("/reconcile/{idempotencyKey}")
    public ResponseEntity<PosSaleReconciliationResponse> reconcileSale(
            Authentication authentication,
            @PathVariable("idempotencyKey") String idempotencyKey) {
        PosSaleReconciliationResponse response = finalizationService.reconcileSale(
                idempotencyKey, AuthenticatedBillingAdmin.from(authentication));
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(response);
    }

    @GetMapping("/{saleId:\\d+}")
    public ResponseEntity<PosSaleDetailResponse> getSaleDetail(
            Authentication authentication,
            @PathVariable("saleId") long saleId) {
        PosSaleDetailResponse response = finalizationService.getSaleDetail(
                saleId, AuthenticatedBillingAdmin.from(authentication));
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(response);
    }
}
