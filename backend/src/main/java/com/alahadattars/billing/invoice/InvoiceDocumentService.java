package com.alahadattars.billing.invoice;

import org.springframework.stereotype.Service;

import java.util.EnumMap;
import java.util.Map;

/** Generates and persists a supplied immutable snapshot; it does not create POS sales or read live prices. */
@Service
public class InvoiceDocumentService {
    private final InvoicePdfRenderer renderer;
    private final InvoiceJdbcRepository repository;
    private final InvoiceWordingProvider wordingProvider;

    public InvoiceDocumentService(InvoicePdfRenderer renderer, InvoiceJdbcRepository repository,
                                  InvoiceWordingProvider wordingProvider) {
        this.renderer = renderer;
        this.repository = repository;
        this.wordingProvider = wordingProvider;
    }

    public long generateAndStore(InvoiceSnapshot invoice, String financialYear) {
        wordingProvider.validate(invoice);
        Map<InvoicePaperFormat, byte[]> pdfs = new EnumMap<>(InvoicePaperFormat.class);
        pdfs.put(InvoicePaperFormat.A4, renderer.render(invoice, InvoicePaperFormat.A4));
        pdfs.put(InvoicePaperFormat.THERMAL_80, renderer.render(invoice, InvoicePaperFormat.THERMAL_80));
        return repository.store(invoice, financialYear, pdfs);
    }
}
