package com.alahadattars.controller;

import com.alahadattars.dto.order.OrderRequest;
import com.alahadattars.dto.order.OrderResponse;
import com.alahadattars.response.ApiResponse;
import com.alahadattars.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Tag(name = "Orders", description = "APIs for managing customer orders")
public class OrderController {

    private final OrderService orderService;

    @Operation(summary = "Create a new order from checkout")
    @PostMapping
    public ResponseEntity<ApiResponse<OrderResponse>> createOrder(@Valid @RequestBody OrderRequest request) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info("Creating new order for user: {}", email);
        OrderResponse response = orderService.createOrder(email, request);
        return ResponseEntity.ok(ApiResponse.<OrderResponse>builder()
                .success(true)
                .message("Order created successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Get all orders for the current user")
    @GetMapping
    public ResponseEntity<ApiResponse<org.springframework.data.domain.Page<OrderResponse>>> getUserOrders(
            @org.springframework.data.web.PageableDefault(size = 10, page = 0, sort = "createdAt", direction = org.springframework.data.domain.Sort.Direction.DESC) 
            org.springframework.data.domain.Pageable pageable) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info("Fetching orders for user: {}", email);
        org.springframework.data.domain.Page<OrderResponse> response = orderService.getUserOrders(email, pageable);
        return ResponseEntity.ok(ApiResponse.<org.springframework.data.domain.Page<OrderResponse>>builder()
                .success(true)
                .message("Orders retrieved successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Get order details by ID")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderById(@PathVariable Long id) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info("Fetching order details for ID: {} user: {}", id, email);
        OrderResponse response = orderService.getOrderById(email, id);
        return ResponseEntity.ok(ApiResponse.<OrderResponse>builder()
                .success(true)
                .message("Order retrieved successfully")
                .data(response)
                .build());
    }

    // Admin endpoints (would be secured via SecurityConfig)
    @Operation(summary = "Get all orders (Admin)")
    @GetMapping("/all")
    public ResponseEntity<ApiResponse<org.springframework.data.domain.Page<OrderResponse>>> getAllOrders(
            @RequestParam(required = false) String search,
            @org.springframework.data.web.PageableDefault(size = 10, page = 0, sort = "createdAt", direction = org.springframework.data.domain.Sort.Direction.DESC) 
            org.springframework.data.domain.Pageable pageable) {
        log.info("Admin fetching all orders with search: {}", search);
        org.springframework.data.domain.Page<OrderResponse> response = orderService.getAllOrders(search, pageable);
        return ResponseEntity.ok(ApiResponse.<org.springframework.data.domain.Page<OrderResponse>>builder()
                .success(true)
                .message("All orders retrieved successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Update order status (Admin)")
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<OrderResponse>> updateOrderStatus(@PathVariable Long id, @RequestParam String status) {
        log.info("Admin updating order {} status to {}", id, status);
        OrderResponse response = orderService.updateOrderStatus(id, status);
        return ResponseEntity.ok(ApiResponse.<OrderResponse>builder()
                .success(true)
                .message("Order status updated successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Confirm order (Admin)")
    @PostMapping("/{id}/confirm")
    public ResponseEntity<ApiResponse<OrderResponse>> confirmOrder(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.<OrderResponse>builder()
                .success(true)
                .message("Order confirmed successfully")
                .data(orderService.updateOrderStatus(id, "CONFIRMED"))
                .build());
    }

    @Operation(summary = "Mark order as packed (Admin)")
    @PostMapping("/{id}/pack")
    public ResponseEntity<ApiResponse<OrderResponse>> packOrder(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.<OrderResponse>builder()
                .success(true)
                .message("Order marked as packed")
                .data(orderService.updateOrderStatus(id, "PACKED"))
                .build());
    }

    @Operation(summary = "Mark order as shipped (Admin)")
    @PostMapping("/{id}/ship")
    public ResponseEntity<ApiResponse<OrderResponse>> shipOrder(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.<OrderResponse>builder()
                .success(true)
                .message("Order marked as shipped")
                .data(orderService.updateOrderStatus(id, "SHIPPED"))
                .build());
    }

    @Operation(summary = "Mark order as delivered (Admin)")
    @PostMapping("/{id}/deliver")
    public ResponseEntity<ApiResponse<OrderResponse>> deliverOrder(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.<OrderResponse>builder()
                .success(true)
                .message("Order marked as delivered")
                .data(orderService.updateOrderStatus(id, "DELIVERED"))
                .build());
    }

    @Operation(summary = "Cancel order (Customer) — only allowed when status is CONFIRMED")
    @PostMapping("/{id}/customer-cancel")
    public ResponseEntity<ApiResponse<OrderResponse>> customerCancelOrder(@PathVariable Long id) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info("Customer {} requesting cancellation of order {}", email, id);
        OrderResponse response = orderService.cancelOrder(email, id);
        return ResponseEntity.ok(ApiResponse.<OrderResponse>builder()
                .success(true)
                .message("Order cancelled successfully")
                .data(response)
                .build());
    }

    @Operation(summary = "Cancel order (Admin)")
    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<OrderResponse>> cancelOrder(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.<OrderResponse>builder()
                .success(true)
                .message("Order cancelled")
                .data(orderService.updateOrderStatus(id, "CANCELLED"))
                .build());
    }

    @Operation(summary = "Update shipping details (Admin)")
    @PatchMapping("/{id}/shipping")
    public ResponseEntity<ApiResponse<OrderResponse>> updateShippingDetails(
            @PathVariable Long id,
            @RequestBody com.alahadattars.dto.order.ShippingUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.<OrderResponse>builder()
                .success(true)
                .message("Shipping details updated")
                .data(orderService.updateShippingDetails(id, request))
                .build());
    }

    /**
     * Admin-only: initiate a Razorpay refund for a cancelled, paid order.
     * Secured at SecurityConfig level to ROLE_ADMIN only.
     * Customers will receive 403 Forbidden if they attempt to call this endpoint.
     */
    @Operation(summary = "Initiate refund via Razorpay (Admin only)")
    @PostMapping("/{id}/refund")
    public ResponseEntity<ApiResponse<OrderResponse>> initiateRefund(@PathVariable Long id) {
        String adminEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info("Admin {} initiating refund for order {}", adminEmail, id);
        OrderResponse response = orderService.initiateRefund(adminEmail, id);
        String message = response.getRefundStatus() != null &&
                         response.getRefundStatus().name().equals("COMPLETED")
                ? "Refund initiated successfully. Refund ID: " + response.getRefundId()
                : "Refund request processed. Status: " + response.getRefundStatus();
        return ResponseEntity.ok(ApiResponse.<OrderResponse>builder()
                .success(true)
                .message(message)
                .data(response)
                .build());
    }
}
