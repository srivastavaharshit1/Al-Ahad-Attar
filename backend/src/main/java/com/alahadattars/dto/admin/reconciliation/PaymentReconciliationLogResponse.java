package com.alahadattars.dto.admin.reconciliation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentReconciliationLogResponse {
    private Long id;
    private String action;
    private String statusBefore;
    private String statusAfter;
    private String paymentId;
    private String refundId;
    private BigDecimal amount;
    private String actor;
    private String details;
    private LocalDateTime createdAt;
}

