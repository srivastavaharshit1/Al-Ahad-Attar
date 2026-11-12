package com.alahadattars.billing.discount;

import java.time.Instant;

public record DiscountAuditEventView(long id, long actorUserId, String actorEmail, String action,
                                     String reason, String eventData, Instant createdAt) {
}
