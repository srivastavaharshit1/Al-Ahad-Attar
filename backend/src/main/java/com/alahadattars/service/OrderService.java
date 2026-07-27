package com.alahadattars.service;

import com.alahadattars.dto.order.OrderRequest;
import com.alahadattars.dto.order.OrderResponse;

import java.util.List;

public interface OrderService {
    
    OrderResponse createOrder(String email, OrderRequest request);
    
    org.springframework.data.domain.Page<OrderResponse> getUserOrders(String email, org.springframework.data.domain.Pageable pageable);
    
    OrderResponse getOrderById(String email, Long orderId);
    
    org.springframework.data.domain.Page<OrderResponse> getAllOrders(String search, org.springframework.data.domain.Pageable pageable);
    
    OrderResponse updateOrderStatus(Long orderId, String status);
    
    OrderResponse updateShippingDetails(Long orderId, com.alahadattars.dto.order.ShippingUpdateRequest request);
    
    OrderResponse updatePaymentStatus(Long orderId, String paymentStatus);

    /**
     * Customer-facing cancellation. Only allowed when the order is in CONFIRMED status.
     * Restores inventory immediately and sets refundStatus=PENDING if payment was PAID.
     * Throws BadRequestException if the order has already moved to PACKED or beyond.
     */
    OrderResponse cancelOrder(String email, Long orderId);

    /**
     * Admin-only: initiates a Razorpay refund for a cancelled, paid order.
     * Sets refundStatus to COMPLETED or FAILED based on Razorpay's response.
     * @param adminEmail Email of the admin triggering the refund (audit trail).
     * @param orderId    ID of the order to refund.
     */
    OrderResponse initiateRefund(String adminEmail, Long orderId);
}

