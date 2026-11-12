package com.alahadattars.billing.online;

import java.time.Instant;

public record OnlineInvoiceJobView(long id, long orderId, Long invoiceId, OnlineInvoiceJobStatus status,
                                   int attemptCount, Instant nextAttemptAt, String lastErrorCode,
                                   String lastErrorSummary, Long retryRequestedBy, Instant createdAt,
                                   Instant updatedAt) { }
