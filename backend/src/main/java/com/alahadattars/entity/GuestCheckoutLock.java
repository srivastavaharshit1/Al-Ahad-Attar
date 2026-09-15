package com.alahadattars.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "guest_checkout_lock")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GuestCheckoutLock {
    
    @Id
    @Column(name = "email", length = 255)
    private String email;
    
    @Column(name = "locked_at")
    private LocalDateTime lockedAt;
}
