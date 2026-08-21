package com.alahadattars.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "admin_notifications")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminNotification extends BaseEntity {

    @Column(nullable = false, length = 500)
    private String message;

    @Column(nullable = false, length = 50)
    private String type; // e.g. "ORDER_PLACED", "ORDER_CANCELLED"

    @Column(name = "order_id")
    private Long orderId; // Nullable, as notifications could be for other things in the future

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean isRead = false;
}
