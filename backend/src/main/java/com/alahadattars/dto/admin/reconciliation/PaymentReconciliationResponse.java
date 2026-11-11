package com.alahadattars.dto.admin.reconciliation;

import com.alahadattars.enums.ReconciliationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentReconciliationResponse {
    private Long id;
    private String razorpayOrderId;
    private String razorpayPaymentId;
    private BigDecimal amount;
    private boolean consumed;
    private String customerEmail;
    private String customerName;
    private ReconciliationStatus reconciliationStatus;
    private String reconciliationRefundId;
    private String reconciliationFailureReason;
    private int reconciliationAttempts;
    private LocalDateTime reconciliationLeaseExpiresAt;
    private LocalDateTime reconciliationLastAttemptAt;
    private LocalDateTime reconciliationResolvedAt;
    private LocalDateTime createdAt;
    private List<PaymentReconciliationLogResponse> logs;
}

