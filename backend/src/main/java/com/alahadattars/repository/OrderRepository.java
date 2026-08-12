package com.alahadattars.repository;

import com.alahadattars.entity.Order;
import com.alahadattars.enums.RefundStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    
    org.springframework.data.domain.Page<Order> findByUserEmail(String email, org.springframework.data.domain.Pageable pageable);
    
    @org.springframework.data.jpa.repository.Query("SELECT o FROM Order o WHERE o.orderNumber LIKE %:search% OR o.user.email LIKE %:search% OR o.user.firstName LIKE %:search% OR o.user.lastName LIKE %:search%")
    org.springframework.data.domain.Page<Order> searchOrders(@org.springframework.data.repository.query.Param("search") String search, org.springframework.data.domain.Pageable pageable);
    
    Optional<Order> findByIdAndUserEmail(Long id, String email);

    Optional<Order> findByOrderNumber(String orderNumber);

    /** Guards against a Razorpay payment id being attached to more than one order. */
    boolean existsByTransactionId(String transactionId);

    long countByUserEmail(String email);

    @org.springframework.data.jpa.repository.Query("SELECT CASE WHEN COUNT(o) > 0 THEN true ELSE false END FROM Order o JOIN o.items i WHERE o.user.id = :userId AND i.variant.product.id = :productId AND o.status = com.alahadattars.enums.OrderStatus.DELIVERED")
    boolean hasUserPurchasedProduct(@org.springframework.data.repository.query.Param("userId") Long userId, @org.springframework.data.repository.query.Param("productId") Long productId);

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.paymentStatus = com.alahadattars.enums.PaymentStatus.PAID")
    java.math.BigDecimal getTotalRevenue();

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.paymentStatus = com.alahadattars.enums.PaymentStatus.PAID AND CAST(o.createdAt AS date) = CURRENT_DATE")
    java.math.BigDecimal getTodaysRevenue();

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(o) FROM Order o WHERE o.status = :status")
    long countByStatus(@org.springframework.data.repository.query.Param("status") com.alahadattars.enums.OrderStatus status);

    // Plain findTop5ByOrderByCreatedAtDesc() left shippingAddress LAZY, so mapping each of the 5
    // orders to a response (which reads getShippingAddress()) fired one extra query per order —
    // a 5-query N+1 on top of the dashboard's already-long chain of sequential count/sum queries.
    // JOIN FETCH is safe to paginate here since shippingAddress is a to-one association, not a
    // collection — no risk of the row-duplication issue that affects fetch-joined collections.
    @org.springframework.data.jpa.repository.Query("SELECT o FROM Order o JOIN FETCH o.shippingAddress ORDER BY o.createdAt DESC")
    List<Order> findTop5ByOrderByCreatedAtDesc(org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query(value =
        "SELECT TO_CHAR(o.created_at, 'Mon') as month, SUM(o.total_amount) as revenue " +
        "FROM orders o WHERE o.payment_status = 'PAID' AND o.created_at >= CURRENT_DATE - INTERVAL '6 months' " +
        "GROUP BY TO_CHAR(o.created_at, 'Mon'), EXTRACT(YEAR FROM o.created_at), EXTRACT(MONTH FROM o.created_at) " +
        "ORDER BY EXTRACT(YEAR FROM o.created_at) ASC, EXTRACT(MONTH FROM o.created_at) ASC", nativeQuery = true)
    List<Object[]> getMonthlyRevenue();

    @org.springframework.data.jpa.repository.Query(
        "SELECT new com.alahadattars.dto.admin.CustomerListResponse(" +
        "u.id, u.firstName, u.lastName, u.email, u.phone, u.createdAt, " +
        "COUNT(o), SUM(CASE WHEN o.paymentStatus = com.alahadattars.enums.PaymentStatus.PAID THEN o.totalAmount ELSE 0 END), u.enabled) " +
        "FROM User u LEFT JOIN Order o ON u = o.user " +
        "WHERE u.role.name = 'USER' " +
        // CAST(:search AS string): Postgres can't infer a bind parameter's type from an "IS NULL"
        // check alone, and this same parameter is reused inside LOWER(...) below — without an
        // explicit type, it defaults to bytea and Postgres fails to type-check "lower(bytea)" at
        // parse time (even for the LIKE branches that would be skipped at runtime when search is
        // actually null, which is the common no-filter case this admin list loads with).
        "AND (:search IS NULL OR LOWER(u.firstName) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%'))) " +
        "GROUP BY u.id, u.firstName, u.lastName, u.email, u.phone, u.createdAt, u.enabled")
    org.springframework.data.domain.Page<com.alahadattars.dto.admin.CustomerListResponse> getCustomerList(@org.springframework.data.repository.query.Param("search") String search, org.springframework.data.domain.Pageable pageable);

    /**
     * Conditionally transitions CONFIRMED -> CANCELLED. Returns 0 when the order is no longer
     * CONFIRMED (already cancelled, already packed/shipped/delivered, or a concurrent request got
     * there first) — the atomic guard that stops two concurrent cancel requests (customer or
     * admin) for the same order from both proceeding, and stops a cancel racing a "mark packed"
     * from both succeeding (see {@link #claimStatusTransition}, the same pattern).
     */
    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query("UPDATE Order o SET o.status = com.alahadattars.enums.OrderStatus.CANCELLED "
            + "WHERE o.id = :id AND o.status = com.alahadattars.enums.OrderStatus.CONFIRMED")
    int claimCancellation(@org.springframework.data.repository.query.Param("id") Long id);

    /**
     * Generic atomic status transition: only takes effect if the order's current status is
     * exactly {@code requiredStatus}. Returns the number of affected rows (0 or 1) — 0 means
     * either the order was already somewhere else in its lifecycle, or a concurrent request (e.g.
     * a customer cancelling at the exact moment an admin marks the order packed) got there first.
     * This is the sole concurrency guard for CONFIRMED->PACKED->SHIPPED->DELIVERED — a plain
     * read-modify-write here would let a stale in-memory read silently overwrite a cancellation
     * that committed in between.
     */
    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query("UPDATE Order o SET o.status = :newStatus "
            + "WHERE o.id = :id AND o.status = :requiredStatus")
    int claimStatusTransition(@org.springframework.data.repository.query.Param("id") Long id,
                               @org.springframework.data.repository.query.Param("requiredStatus") com.alahadattars.enums.OrderStatus requiredStatus,
                               @org.springframework.data.repository.query.Param("newStatus") com.alahadattars.enums.OrderStatus newStatus);

    // ─── Refund queries ─────────────────────────────────────────────────────────

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(o) FROM Order o WHERE o.refundStatus = :refundStatus")
    long countByRefundStatus(@org.springframework.data.repository.query.Param("refundStatus") RefundStatus refundStatus);

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(o.refundAmount), 0) FROM Order o WHERE o.refundStatus = com.alahadattars.enums.RefundStatus.REFUNDED")
    java.math.BigDecimal getTotalRefunded();

    /**
     * Conditionally claims the PROCESSING refund state. Returns 0 when another request already claimed
     * it (or a refund already completed), which is what stops two concurrent refund requests for the
     * same order (e.g. an admin double-click) from both calling the Razorpay refund API.
     */
    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query("UPDATE Order o SET o.refundStatus = com.alahadattars.enums.RefundStatus.PROCESSING "
            + "WHERE o.id = :id AND o.refundStatus <> com.alahadattars.enums.RefundStatus.PROCESSING "
            + "AND o.refundStatus <> com.alahadattars.enums.RefundStatus.REFUNDED")
    int claimRefundProcessing(@org.springframework.data.repository.query.Param("id") Long id);

    List<Order> findByRefundStatusOrderByUpdatedAtDesc(RefundStatus refundStatus);

    /** Reconciliation lookup: which order (if any) already recorded this Razorpay refund id. */
    Optional<Order> findByRefundId(String refundId);

    /**
     * Reconciliation lookup for the "we called Razorpay but never recorded the outcome" case: the
     * order that was left claiming PROCESSING against this payment id, if any.
     */
    Optional<Order> findByTransactionIdAndRefundStatus(String transactionId, RefundStatus refundStatus);

    /** Admin refund-management listing: every order that has ever needed a refund, filterable/searchable. */
    @org.springframework.data.jpa.repository.Query("SELECT o FROM Order o WHERE o.refundStatus <> com.alahadattars.enums.RefundStatus.NOT_REQUIRED "
            + "AND (:status IS NULL OR o.refundStatus = :status) "
            + "AND (:search IS NULL OR LOWER(o.orderNumber) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) "
            + "OR LOWER(o.user.email) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) "
            + "OR LOWER(o.user.firstName) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) "
            + "OR LOWER(o.user.lastName) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')))")
    org.springframework.data.domain.Page<Order> searchRefunds(
            @org.springframework.data.repository.query.Param("status") RefundStatus status,
            @org.springframework.data.repository.query.Param("search") String search,
            org.springframework.data.domain.Pageable pageable);

    // ─── Analytics queries ──────────────────────────────────────────────────────

    @org.springframework.data.jpa.repository.Query(
        "SELECT oi.productName, SUM(oi.quantity), SUM(oi.subtotal) " +
        "FROM Order o JOIN o.items oi " +
        "WHERE o.paymentStatus = com.alahadattars.enums.PaymentStatus.PAID AND oi.freeItem = false " +
        "GROUP BY oi.productName ORDER BY SUM(oi.subtotal) DESC")
    List<Object[]> getTopSellingProducts(org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query(
        "SELECT c.name, SUM(oi.subtotal), COUNT(DISTINCT o.id) " +
        "FROM Order o JOIN o.items oi JOIN oi.variant v JOIN v.product p JOIN p.category c " +
        "WHERE o.paymentStatus = com.alahadattars.enums.PaymentStatus.PAID AND oi.freeItem = false " +
        "GROUP BY c.name ORDER BY SUM(oi.subtotal) DESC")
    List<Object[]> getTopCategories(org.springframework.data.domain.Pageable pageable);
}

