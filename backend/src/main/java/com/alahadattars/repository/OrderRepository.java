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

    long countByUserEmail(String email);

    @org.springframework.data.jpa.repository.Query("SELECT CASE WHEN COUNT(o) > 0 THEN true ELSE false END FROM Order o JOIN o.items i WHERE o.user.id = :userId AND i.variant.product.id = :productId AND o.status = com.alahadattars.enums.OrderStatus.DELIVERED")
    boolean hasUserPurchasedProduct(@org.springframework.data.repository.query.Param("userId") Long userId, @org.springframework.data.repository.query.Param("productId") Long productId);

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.paymentStatus = com.alahadattars.enums.PaymentStatus.PAID")
    java.math.BigDecimal getTotalRevenue();

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.paymentStatus = com.alahadattars.enums.PaymentStatus.PAID AND DATE(o.createdAt) = CURRENT_DATE")
    java.math.BigDecimal getTodaysRevenue();

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(o) FROM Order o WHERE o.status = :status")
    long countByStatus(@org.springframework.data.repository.query.Param("status") com.alahadattars.enums.OrderStatus status);

    List<Order> findTop5ByOrderByCreatedAtDesc();

    @org.springframework.data.jpa.repository.Query(value = 
        "SELECT DATE_FORMAT(o.created_at, '%b') as month, SUM(o.total_amount) as revenue " +
        "FROM orders o WHERE o.payment_status = 'PAID' AND o.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH) " +
        "GROUP BY DATE_FORMAT(o.created_at, '%b'), YEAR(o.created_at), MONTH(o.created_at) " +
        "ORDER BY YEAR(o.created_at) ASC, MONTH(o.created_at) ASC", nativeQuery = true)
    List<Object[]> getMonthlyRevenue();

    @org.springframework.data.jpa.repository.Query(
        "SELECT new com.alahadattars.dto.admin.CustomerListResponse(" +
        "u.id, u.firstName, u.lastName, u.email, u.phone, u.createdAt, " +
        "COUNT(o), SUM(CASE WHEN o.paymentStatus = com.alahadattars.enums.PaymentStatus.PAID THEN o.totalAmount ELSE 0 END), u.enabled) " +
        "FROM User u LEFT JOIN Order o ON u = o.user " +
        "WHERE u.role.name = 'USER' " +
        "AND (:search IS NULL OR LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))) " +
        "GROUP BY u.id, u.firstName, u.lastName, u.email, u.phone, u.createdAt, u.enabled")
    org.springframework.data.domain.Page<com.alahadattars.dto.admin.CustomerListResponse> getCustomerList(@org.springframework.data.repository.query.Param("search") String search, org.springframework.data.domain.Pageable pageable);

    // ─── Refund queries ─────────────────────────────────────────────────────────

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(o) FROM Order o WHERE o.refundStatus = :refundStatus")
    long countByRefundStatus(@org.springframework.data.repository.query.Param("refundStatus") RefundStatus refundStatus);

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(o.refundAmount), 0) FROM Order o WHERE o.refundStatus = com.alahadattars.enums.RefundStatus.COMPLETED")
    java.math.BigDecimal getTotalRefunded();

    List<Order> findByRefundStatusOrderByUpdatedAtDesc(RefundStatus refundStatus);
}

