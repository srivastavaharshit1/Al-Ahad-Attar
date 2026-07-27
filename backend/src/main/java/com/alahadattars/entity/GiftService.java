package com.alahadattars.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;

/**
 * Represents a premium gift service option (e.g., Luxury Black Box, Classic Gold Wrap).
 * Designed generically so additional premium services (greeting cards, ribbons, etc.)
 * can be added in the future without schema changes.
 */
@Entity
@Table(
    name = "gift_services",
    indexes = {
        @Index(name = "idx_gift_service_active", columnList = "active"),
        @Index(name = "idx_gift_service_sort_order", columnList = "sort_order")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class GiftService extends BaseEntity {

    @NotBlank
    @Column(name = "name", nullable = false, unique = true, length = 200)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @NotNull
    @DecimalMin(value = "0.0", inclusive = true)
    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;
}
