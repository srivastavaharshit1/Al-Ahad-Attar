package com.alahadattars.billing.reporting;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record BillingSalesSummary(LocalDate from, LocalDate to,
                                  long onlineCount, BigDecimal onlineSales, BigDecimal onlineDiscounts,
                                  long posCount, BigDecimal posSales, BigDecimal posDiscounts,
                                  long combinedCount, BigDecimal combinedSales, BigDecimal combinedDiscounts,
                                  List<PaymentBreakdown> paymentBreakdown,
                                  List<SalesBucket> daily, List<SalesBucket> monthly) {
    public record PaymentBreakdown(String method, long count, BigDecimal sales, BigDecimal discounts) { }
    public record SalesBucket(String period, long count, BigDecimal sales, BigDecimal discounts) { }
}
