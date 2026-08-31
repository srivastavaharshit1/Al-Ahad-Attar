package com.alahadattars.entity;

import com.alahadattars.enums.BulkPricingOperation;
import com.alahadattars.enums.BulkPricingScope;
import com.alahadattars.enums.BulkPricingStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "bulk_price_audit")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkPriceAudit extends BaseEntity {

    @Column(name = "admin_id", nullable = false)
    private Long adminId;

    @Column(name = "admin_email", nullable = false)
    private String adminEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private BulkPricingScope scope;

    @Column(name = "category_id")
    private Long categoryId;

    @Column(name = "category_name")
    private String categoryName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private BulkPricingOperation operation;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private com.alahadattars.enums.BulkPricingType type;

    @Column(name = "value", precision = 10, scale = 2)
    private BigDecimal value;

    // Kept to satisfy existing NOT NULL database constraint from previous schema version
    @Column(name = "percentage", nullable = true, precision = 5, scale = 2)
    private BigDecimal percentage;

    @Column(name = "products_affected", nullable = false)
    private int productsAffected;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private BulkPricingStatus status;

    @Column(name = "idempotency_key", unique = true, length = 100)
    private String idempotencyKey;
}
