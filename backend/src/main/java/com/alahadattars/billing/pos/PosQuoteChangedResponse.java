package com.alahadattars.billing.pos;

public record PosQuoteChangedResponse(String code, String message, PosQuoteResponse updatedQuote) {
}
