package com.alahadattars.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(
    name = "testimonial",
    indexes = {
        @Index(name = "idx_testimonial_active", columnList = "active"),
        @Index(name = "idx_testimonial_display_order", columnList = "display_order")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class Testimonial extends BaseEntity {

    @Column(name = "customer_name", length = 150)
    private String customerName;

    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    @Column(nullable = false)
    @Builder.Default
    private int rating = 5;

    @Column(columnDefinition = "TEXT")
    private String review;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private int displayOrder = 0;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
}
