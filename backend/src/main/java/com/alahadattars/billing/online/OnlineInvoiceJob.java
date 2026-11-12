package com.alahadattars.billing.online;

import java.time.Instant;

public record OnlineInvoiceJob(long id, long orderId, int attemptNumber, Instant startedAt) { }
