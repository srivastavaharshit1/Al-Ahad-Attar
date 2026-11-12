package com.alahadattars.billing.reporting;

import java.util.List;

public record BillingPage<T>(List<T> content, long totalElements, int limit, int offset) { }
