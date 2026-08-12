package com.alahadattars.controller;

import com.alahadattars.response.ApiResponse;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.OrderRepository;
import com.alahadattars.repository.ProductRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.UserRepository;
import com.alahadattars.dto.order.OrderResponse;
import com.alahadattars.entity.Order;
import com.alahadattars.enums.RefundStatus;
import com.alahadattars.dto.profile.AddressResponse;
import com.alahadattars.entity.Address;
import com.alahadattars.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Dashboard", description = "Endpoints for admin dashboard stats")
public class AdminDashboardController {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ProductVariantRepository productVariantRepository;

    // Reuses the same bounded pool PublicHomepageServiceImpl uses for its own concurrent-fetch
    // fan-out (AsyncConfig). Field name must match the @Bean's name exactly: with two Executor
    // beans in context (this one and emailTaskExecutor), Spring's constructor-injection only
    // disambiguates by @Qualifier on the actual constructor parameter — but Lombok's
    // @RequiredArgsConstructor does NOT copy @Qualifier from a field onto the generated
    // parameter, so that annotation here would be silently ineffective. Falls back to Spring's
    // by-name resolution instead, which does work reliably.
    private final Executor homepageTaskExecutor;

    private static final int LOW_STOCK_THRESHOLD = 10;

    @Data
    @Builder
    public static class ChartData {
        private String month;
        private BigDecimal revenue;
    }

    @Data
    @Builder
    public static class DashboardStats {
        private long totalProducts;
        private long totalCategories;
        private long totalOrders;
        private long totalCustomers;
        private BigDecimal totalRevenue;
        private BigDecimal todaysRevenue;
        private long confirmedOrders;
        private long packedOrders;
        private long shippedOrders;
        private long deliveredOrders;
        private long cancelledOrders;
        private List<ChartData> monthlyRevenue;
        private List<OrderResponse> recentOrders;
        // Refund stats
        private long pendingRefunds;
        private long completedRefunds;
        private long failedRefunds;
        private BigDecimal totalRefunded;
    }

    @Operation(summary = "Get aggregated dashboard statistics")
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<DashboardStats>> getDashboardStats() {
        // 17 independent counts/sums against different tables — each was previously a separate
        // sequential DB round trip on the request thread. Firing them concurrently instead turns
        // that chain into roughly max(one query's latency) rather than the sum of all 17, which is
        // what was pushing this endpoint past the frontend's request timeout intermittently.
        CompletableFuture<Long> productsF = CompletableFuture.supplyAsync(productRepository::count, homepageTaskExecutor);
        CompletableFuture<Long> categoriesF = CompletableFuture.supplyAsync(categoryRepository::count, homepageTaskExecutor);
        CompletableFuture<Long> ordersF = CompletableFuture.supplyAsync(orderRepository::count, homepageTaskExecutor);
        CompletableFuture<Long> customersF = CompletableFuture.supplyAsync(userRepository::count, homepageTaskExecutor);
        CompletableFuture<BigDecimal> revenueF = CompletableFuture.supplyAsync(orderRepository::getTotalRevenue, homepageTaskExecutor);
        CompletableFuture<BigDecimal> todaysRevenueF = CompletableFuture.supplyAsync(orderRepository::getTodaysRevenue, homepageTaskExecutor);

        CompletableFuture<Long> confirmedF = CompletableFuture.supplyAsync(() -> orderRepository.countByStatus(com.alahadattars.enums.OrderStatus.CONFIRMED), homepageTaskExecutor);
        CompletableFuture<Long> packedF = CompletableFuture.supplyAsync(() -> orderRepository.countByStatus(com.alahadattars.enums.OrderStatus.PACKED), homepageTaskExecutor);
        CompletableFuture<Long> shippedF = CompletableFuture.supplyAsync(() -> orderRepository.countByStatus(com.alahadattars.enums.OrderStatus.SHIPPED), homepageTaskExecutor);
        CompletableFuture<Long> deliveredF = CompletableFuture.supplyAsync(() -> orderRepository.countByStatus(com.alahadattars.enums.OrderStatus.DELIVERED), homepageTaskExecutor);
        CompletableFuture<Long> cancelledF = CompletableFuture.supplyAsync(() -> orderRepository.countByStatus(com.alahadattars.enums.OrderStatus.CANCELLED), homepageTaskExecutor);

        CompletableFuture<Long> pendingRefundsF = CompletableFuture.supplyAsync(() -> orderRepository.countByRefundStatus(RefundStatus.REFUND_REQUIRED), homepageTaskExecutor);
        CompletableFuture<Long> completedRefundsF = CompletableFuture.supplyAsync(() -> orderRepository.countByRefundStatus(RefundStatus.REFUNDED), homepageTaskExecutor);
        CompletableFuture<Long> failedRefundsF = CompletableFuture.supplyAsync(() -> orderRepository.countByRefundStatus(RefundStatus.FAILED), homepageTaskExecutor);
        CompletableFuture<BigDecimal> totalRefundedF = CompletableFuture.supplyAsync(orderRepository::getTotalRefunded, homepageTaskExecutor);

        CompletableFuture<List<ChartData>> chartDataF = CompletableFuture.supplyAsync(orderRepository::getMonthlyRevenue, homepageTaskExecutor)
                .thenApply(monthlyData -> {
                    List<ChartData> chartData = new ArrayList<>();
                    if (monthlyData != null) {
                        for (Object[] row : monthlyData) {
                            String month = (String) row[0];
                            BigDecimal rev = row[1] != null ? new BigDecimal(row[1].toString()) : BigDecimal.ZERO;
                            chartData.add(ChartData.builder().month(month).revenue(rev).build());
                        }
                    }
                    return chartData;
                });

        CompletableFuture<List<OrderResponse>> recentOrdersF = CompletableFuture.supplyAsync(
                () -> orderRepository.findTop5ByOrderByCreatedAtDesc(org.springframework.data.domain.PageRequest.of(0, 5)),
                homepageTaskExecutor
        ).thenApply(orders -> orders.stream().map(this::mapToResponse).collect(Collectors.toList()));

        CompletableFuture.allOf(productsF, categoriesF, ordersF, customersF, revenueF, todaysRevenueF,
                confirmedF, packedF, shippedF, deliveredF, cancelledF,
                pendingRefundsF, completedRefundsF, failedRefundsF, totalRefundedF,
                chartDataF, recentOrdersF).join();

        DashboardStats stats = DashboardStats.builder()
                .totalProducts(productsF.join())
                .totalCategories(categoriesF.join())
                .totalOrders(ordersF.join())
                .totalCustomers(customersF.join())
                .totalRevenue(revenueF.join())
                .todaysRevenue(todaysRevenueF.join())
                .confirmedOrders(confirmedF.join())
                .packedOrders(packedF.join())
                .shippedOrders(shippedF.join())
                .deliveredOrders(deliveredF.join())
                .cancelledOrders(cancelledF.join())
                .monthlyRevenue(chartDataF.join())
                .recentOrders(recentOrdersF.join())
                .pendingRefunds(pendingRefundsF.join())
                .completedRefunds(completedRefundsF.join())
                .failedRefunds(failedRefundsF.join())
                .totalRefunded(totalRefundedF.join())
                .build();

        return ResponseEntity.ok(ApiResponse.<DashboardStats>builder()
                .success(true)
                .message("Stats retrieved successfully")
                .data(stats)
                .build());
    }

    @Data
    @Builder
    public static class TopProductStat {
        private String productName;
        private long unitsSold;
        private BigDecimal revenue;
    }

    @Data
    @Builder
    public static class TopCategoryStat {
        private String categoryName;
        private BigDecimal revenue;
        private long orderCount;
    }

    @Data
    @Builder
    public static class LowStockItem {
        private String productName;
        private String size;
        private Integer stock;
    }

    @Data
    @Builder
    public static class AnalyticsData {
        private List<TopProductStat> topProducts;
        private List<TopCategoryStat> topCategories;
        private List<LowStockItem> lowStockItems;
        private int lowStockThreshold;
    }

    @Operation(summary = "Get top products, top categories, and low-stock items")
    @GetMapping("/analytics")
    public ResponseEntity<ApiResponse<AnalyticsData>> getAnalytics() {
        org.springframework.data.domain.Pageable top10 = org.springframework.data.domain.PageRequest.of(0, 10);

        CompletableFuture<List<TopProductStat>> topProductsF = CompletableFuture.supplyAsync(
                () -> orderRepository.getTopSellingProducts(top10), homepageTaskExecutor
        ).thenApply(rows -> rows.stream()
                .map(row -> TopProductStat.builder()
                        .productName((String) row[0])
                        .unitsSold(row[1] != null ? ((Number) row[1]).longValue() : 0L)
                        .revenue(row[2] != null ? new BigDecimal(row[2].toString()) : BigDecimal.ZERO)
                        .build())
                .collect(Collectors.toList()));

        CompletableFuture<List<TopCategoryStat>> topCategoriesF = CompletableFuture.supplyAsync(
                () -> orderRepository.getTopCategories(top10), homepageTaskExecutor
        ).thenApply(rows -> rows.stream()
                .map(row -> TopCategoryStat.builder()
                        .categoryName((String) row[0])
                        .revenue(row[1] != null ? new BigDecimal(row[1].toString()) : BigDecimal.ZERO)
                        .orderCount(row[2] != null ? ((Number) row[2]).longValue() : 0L)
                        .build())
                .collect(Collectors.toList()));

        // findLowStock touches variant.getProduct().getName() (a LAZY @ManyToOne) per row while
        // mapping — kept on the same thread as the query itself (not split into a separate
        // .thenApply) so that access happens inside the same short-lived transaction/session that
        // loaded the variants, rather than after it's already closed.
        CompletableFuture<List<LowStockItem>> lowStockItemsF = CompletableFuture.supplyAsync(
                () -> productVariantRepository.findLowStock(LOW_STOCK_THRESHOLD, top10).stream()
                        .map(variant -> LowStockItem.builder()
                                .productName(variant.getProduct().getName())
                                .size(variant.getSize())
                                .stock(variant.getStock())
                                .build())
                        .collect(Collectors.toList()),
                homepageTaskExecutor
        );

        CompletableFuture.allOf(topProductsF, topCategoriesF, lowStockItemsF).join();

        AnalyticsData data = AnalyticsData.builder()
                .topProducts(topProductsF.join())
                .topCategories(topCategoriesF.join())
                .lowStockItems(lowStockItemsF.join())
                .lowStockThreshold(LOW_STOCK_THRESHOLD)
                .build();

        return ResponseEntity.ok(ApiResponse.<AnalyticsData>builder()
                .success(true)
                .message("Analytics retrieved successfully")
                .data(data)
                .build());
    }

    private OrderResponse mapToResponse(Order order) {
        Address addr = order.getShippingAddress();
        AddressResponse addressResponse = null;
        if (addr != null) {
            addressResponse = AddressResponse.builder()
                    .id(addr.getId())
                    .fullName(addr.getFullName())
                    .phone(addr.getPhone())
                    .addressLine1(addr.getAddressLine1())
                    .addressLine2(addr.getAddressLine2())
                    .landmark(addr.getLandmark())
                    .city(addr.getCity())
                    .state(addr.getState())
                    .postalCode(addr.getPostalCode())
                    .country(addr.getCountry())
                    .build();
        }

        return OrderResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .shippingAddress(addressResponse)
                .totalAmount(order.getTotalAmount())
                .status(order.getStatus())
                .createdAt(order.getCreatedAt())
                .build();
    }
}
