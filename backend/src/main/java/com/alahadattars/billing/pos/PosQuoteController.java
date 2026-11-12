package com.alahadattars.billing.pos;

import com.alahadattars.billing.security.AuthenticatedBillingAdmin;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@PreAuthorize("hasRole('ADMIN')")
@RequestMapping("/api/billing/pos")
public class PosQuoteController {
    private final PosQuoteService quoteService;

    public PosQuoteController(PosQuoteService quoteService) {
        this.quoteService = quoteService;
    }

    @PostMapping("/quotes")
    public ResponseEntity<PosQuoteResponse> quote(
            Authentication authentication,
            @Valid @RequestBody PosQuoteRequest request) {
        PosQuoteResponse quote = quoteService.quote(request, AuthenticatedBillingAdmin.from(authentication));
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(quote);
    }
}
