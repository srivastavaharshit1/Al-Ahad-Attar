package com.alahadattars.billing.pos;

/** Signals that the server-authoritative quote no longer matches the Admin's confirmation. */
public class PosQuoteChangedException extends RuntimeException {
    private final PosQuoteResponse updatedQuote;

    public PosQuoteChangedException(PosQuoteResponse updatedQuote) {
        super("The POS quote changed. Review the updated totals before confirming again.");
        this.updatedQuote = updatedQuote;
    }

    public PosQuoteResponse updatedQuote() {
        return updatedQuote;
    }
}
