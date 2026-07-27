package com.alahadattars.controller;

import com.alahadattars.response.ApiResponse;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.OrderRepository;
import com.alahadattars.repository.ProductRepository;
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
        long products = productRepository.count();
        long categories = categoryRepository.count();
        long orders = orderRepository.count(); 
        long customers = userRepository.count();
        BigDecimal revenue = orderRepository.getTotalRevenue();
        BigDecimal todaysRevenue = orderRepository.getTodaysRevenue();

        long confirmedOrders = orderRepository.countByStatus(com.alahadattars.enums.OrderStatus.CONFIRMED);
        long packedOrders = orderRepository.countByStatus(com.alahadattars.enums.OrderStatus.PACKED);
        long shippedOrders = orderRepository.countByStatus(com.alahadattars.enums.OrderStatus.SHIPPED);
        long deliveredOrders = orderRepository.countByStatus(com.alahadattars.enums.OrderStatus.DELIVERED);
        long cancelledOrders = orderRepository.countByStatus(com.alahadattars.enums.OrderStatus.CANCELLED);

        // Refund stats
        long pendingRefunds = orderRepository.countByRefundStatus(RefundStatus.PENDING);
        long completedRefunds = orderRepository.countByRefundStatus(RefundStatus.COMPLETED);
        long failedRefunds = orderRepository.countByRefundStatus(RefundStatus.FAILED);
        BigDecimal totalRefunded = orderRepository.getTotalRefunded();

        List<Object[]> monthlyData = orderRepository.getMonthlyRevenue();
        List<ChartData> chartData = new ArrayList<>();
        if (monthlyData != null) {
            for (Object[] row : monthlyData) {
                String month = (String) row[0];
                BigDecimal rev = row[1] != null ? new BigDecimal(row[1].toString()) : BigDecimal.ZERO;
                chartData.add(ChartData.builder().month(month).revenue(rev).build());
            }
        }

        List<OrderResponse> recentOrders = orderRepository.findTop5ByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        DashboardStats stats = DashboardStats.builder()
                .totalProducts(products)
                .totalCategories(categories)
                .totalOrders(orders)
                .totalCustomers(customers)
                .totalRevenue(revenue)
                .todaysRevenue(todaysRevenue)
                .confirmedOrders(confirmedOrders)
                .packedOrders(packedOrders)
                .shippedOrders(shippedOrders)
                .deliveredOrders(deliveredOrders)
                .cancelledOrders(cancelledOrders)
                .monthlyRevenue(chartData)
                .recentOrders(recentOrders)
                .pendingRefunds(pendingRefunds)
                .completedRefunds(completedRefunds)
                .failedRefunds(failedRefunds)
                .totalRefunded(totalRefunded)
                .build();

        return ResponseEntity.ok(ApiResponse.<DashboardStats>builder()
                .success(true)
                .message("Stats retrieved successfully")
                .data(stats)
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
