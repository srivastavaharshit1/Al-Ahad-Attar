package com.alahadattars.billing.pos;

public record PosSaleReconciliationResponse(
        String status,
        PosSaleFinalizeResponse sale
) {}

