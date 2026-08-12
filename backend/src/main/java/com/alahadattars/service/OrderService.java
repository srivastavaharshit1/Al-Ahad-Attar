package com.alahadattars.service;

import com.alahadattars.dto.order.OrderRequest;
import com.alahadattars.dto.order.OrderResponse;

public interface OrderService {

    OrderResponse createOrder(String email, OrderRequest request);

    org.springframework.data.domain.Page<OrderResponse> getUserOrders(String email, org.springframework.data.domain.Pageable pageable);

    OrderResponse getOrderById(String email, Long orderId);

    org.springframework.data.domain.Page<OrderResponse> getAllOrders(String search, org.springframework.data.domain.Pageable pageable);

    /**
     * Admin-only status transitions: CONFIRMED -&gt; PACKED -&gt; SHIPPED -&gt; DELIVERED.
     * Any other target (including CANCELLED — use {@link #cancelOrder}/{@link #adminCancelOrder}
     * instead) or a transition from the wrong current status is rejected. Atomic — a concurrent
     * transition attempt on the same order (e.g. a customer cancelling at the same instant an
     * admin marks it packed) can never both succeed.
     */
    OrderResponse updateOrderStatus(Long orderId, String status);

    OrderResponse updateShippingDetails(Long orderId, com.alahadattars.dto.order.ShippingUpdateRequest request);

    /**
     * Customer-facing cancellation. Only allowed when the order is in CONFIRMED status — once
     * PACKED, cancellation is permanently disabled. Restores inventory immediately and, for paid
     * orders, sets refundStatus=REFUND_REQUIRED. Never calls Razorpay itself: the actual refund is
     * a separate, admin-triggered action via {@link #initiateRefund}.
     * Throws BadRequestException if the order has already moved to PACKED or beyond.
     */
    OrderResponse cancelOrder(String email, Long orderId);

    /**
     * Admin-initiated cancellation (e.g. handling a phone/support request on the customer's
     * behalf). Enforces the identical CONFIRMED-only rule as {@link #cancelOrder} — PACKED is the
     * cancellation cutoff regardless of who initiates it — but is not restricted to the order's
     * owner. Never calls Razorpay itself, same as the customer path.
     * @param adminEmail Email of the admin cancelling the order (audit trail).
     */
    OrderResponse adminCancelOrder(String adminEmail, Long orderId);

    /**
     * Admin-only: initiates a full Razorpay refund for a cancelled, paid order whose refund is
     * REFUND_REQUIRED or FAILED. The refund amount is always derived from trusted order data
     * (never client-supplied) and is always the order's full total — partial refunds are out of
     * scope for this cancellation policy. If the order is already stuck in PROCESSING from a
     * prior attempt whose outcome was never recorded (a crash or network timeout after Razorpay
     * accepted the refund), this reconciles with Razorpay's own record instead of blindly retrying
     * or blindly marking it failed.
     * @param adminEmail Email of the admin triggering the refund (audit trail).
     * @param orderId    ID of the order to refund.
     */
    OrderResponse initiateRefund(String adminEmail, Long orderId);

    /** Admin refund-management listing: every order that has ever needed a refund. */
    org.springframework.data.domain.Page<OrderResponse> getRefunds(String status, String search, org.springframework.data.domain.Pageable pageable);
}
