package com.alahadattars.billing.invoice;

import com.alahadattars.billing.delivery.InvoiceConsentRequest;
import com.alahadattars.billing.delivery.InvoiceConsentView;
import com.alahadattars.billing.delivery.InvoiceConsentPolicy;
import com.alahadattars.billing.delivery.InvoiceDeliveryChannel;
import com.alahadattars.billing.delivery.InvoiceDeliveryService;
import com.alahadattars.billing.delivery.InvoiceDeliveryView;
import com.alahadattars.billing.security.AuthenticatedBillingAdmin;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@PreAuthorize("hasRole('ADMIN')")
@RequestMapping("/api/billing/invoices")
public class BillingInvoiceController {
    private final InvoiceDeliveryService deliveryService;

    public BillingInvoiceController(InvoiceDeliveryService deliveryService) {
        this.deliveryService = deliveryService;
    }

    @GetMapping
    public List<InvoiceListItem> history(
            Authentication authentication,
            @RequestParam(required = false) InvoiceChannel channel,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        return deliveryService.findHistory(channel, limit, offset);
    }

    @GetMapping("/consent-policy")
    public List<InvoiceConsentPolicy> consentPolicies(Authentication authentication) {
        return deliveryService.consentPolicies();
    }

    @GetMapping("/{invoiceId}/pdf")
    public ResponseEntity<byte[]> pdf(
            Authentication authentication,
            @PathVariable long invoiceId,
            @RequestParam(defaultValue = "A4") InvoicePaperFormat format) {
        InvoicePdfDocument document = deliveryService.findPdf(invoiceId, format)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Invoice PDF not found"));
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.inline().filename("invoice-" + invoiceId + "-" + format.name() + ".pdf").build());
        headers.setCacheControl(CacheControl.noStore());
        headers.add("X-Content-Type-Options", "nosniff");
        headers.add("ETag", "\"" + document.sha256() + "\"");
        return new ResponseEntity<>(document.content(), headers, HttpStatus.OK);
    }

    @PostMapping("/{invoiceId}/consent")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void consent(Authentication authentication, @PathVariable long invoiceId,
                        @Valid @RequestBody InvoiceConsentRequest request) {
        deliveryService.recordConsent(AuthenticatedBillingAdmin.from(authentication), invoiceId, request);
    }

    @PostMapping("/{invoiceId}/delivery/{channel}")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public InvoiceDeliveryView queueDelivery(
            Authentication authentication,
            @PathVariable long invoiceId,
            @PathVariable InvoiceDeliveryChannel channel,
            @RequestHeader("Idempotency-Key") String idempotencyKey) {
        return deliveryService.enqueue(AuthenticatedBillingAdmin.from(authentication), invoiceId, channel, idempotencyKey);
    }

    @PostMapping("/{invoiceId}/delivery/{deliveryId}/retry")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public InvoiceDeliveryView retryDelivery(
            Authentication authentication,
            @PathVariable long invoiceId,
            @PathVariable long deliveryId,
            @RequestHeader("Idempotency-Key") String idempotencyKey) {
        return deliveryService.retry(AuthenticatedBillingAdmin.from(authentication), invoiceId, deliveryId, idempotencyKey);
    }

    @GetMapping("/{invoiceId}/delivery")
    public List<InvoiceDeliveryView> deliveryHistory(Authentication authentication, @PathVariable long invoiceId) {
        return deliveryService.findDeliveryHistory(invoiceId);
    }

    @GetMapping("/{invoiceId}/consent")
    public List<InvoiceConsentView> consents(Authentication authentication, @PathVariable long invoiceId) {
        return deliveryService.findConsents(invoiceId);
    }
}
