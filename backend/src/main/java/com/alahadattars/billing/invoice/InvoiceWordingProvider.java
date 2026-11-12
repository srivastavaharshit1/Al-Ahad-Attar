package com.alahadattars.billing.invoice;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class InvoiceWordingProvider {
    private final String unregisteredNotice;

    public InvoiceWordingProvider(@Value("${billing.invoice.unregistered-notice:}") String unregisteredNotice) {
        this.unregisteredNotice = unregisteredNotice;
    }

    public void validate(InvoiceSnapshot snapshot) {
        if (snapshot.tax().status() == GstStatus.UNREGISTERED) {
            if (unregisteredNotice == null || unregisteredNotice.isBlank()) {
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                        "Owner/accountant-approved unregistered-invoice wording is not configured");
            }
            if (!unregisteredNotice.equals(snapshot.invoiceNoticeSnapshot())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Invoice wording does not match the approved server configuration");
            }
        }
    }
}
