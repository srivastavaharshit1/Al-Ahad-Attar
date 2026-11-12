package com.alahadattars.billing.online;

import com.alahadattars.billing.reporting.BillingPage;
import com.alahadattars.billing.security.AuthenticatedBillingAdmin;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@PreAuthorize("hasRole('ADMIN')")
@RequestMapping("/api/billing/online-invoice-jobs")
public class OnlineInvoiceJobController {
    private final OnlineInvoiceJobJdbcRepository jobs;

    public OnlineInvoiceJobController(OnlineInvoiceJobJdbcRepository jobs) { this.jobs = jobs; }

    @GetMapping
    public BillingPage<OnlineInvoiceJobView> list(@RequestParam(required = false) OnlineInvoiceJobStatus status,
                                                  @RequestParam(defaultValue = "50") int limit,
                                                  @RequestParam(defaultValue = "0") int offset) {
        validatePage(limit, offset);
        return jobs.findPage(status, limit, offset);
    }

    @PostMapping("/{jobId}/retry")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void retry(Authentication authentication, @PathVariable long jobId,
                      @RequestHeader("Idempotency-Key") String requestKey) {
        if (requestKey == null || !requestKey.matches("^[A-Za-z0-9_-]{16,160}$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid idempotency key is required.");
        }
        if (!jobs.requestRetry(jobId, AuthenticatedBillingAdmin.from(authentication).userId(), requestKey)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only failed or configuration-blocked invoice jobs can be retried.");
        }
    }

    private static void validatePage(int limit, int offset) {
        if (limit < 1 || limit > 200 || offset < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid online invoice job page.");
        }
    }
}
