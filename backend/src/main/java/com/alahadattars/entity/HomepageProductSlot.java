package com.alahadattars.entity;

import com.alahadattars.enums.HomepageProductSection;
import jakarta.persistence.*;
import lombok.*;

/**
 * Persists the admin-curated product placement for the three homepage product carousels.
 *
 * Design notes:
 *  - No product data is duplicated here. Only a FK reference to the existing Product entity.
 *  - section + product must be unique (a product can only appear once per section).
 *  - display_order controls the left-to-right order inside each carousel.
 *  - enabled lets the admin hide a slot without deleting it.
 */
@Entity
@Table(
    name = "homepage_product_slot",
    indexes = {
        @Index(name = "idx_hps_section", columnList = "section"),
        @Index(name = "idx_hps_section_order", columnList = "section, display_order"),
        @Index(name = "idx_hps_product_id", columnList = "product_id")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_hps_section_product", columnNames = {"section", "product_id"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class HomepageProductSlot extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(length = 30, nullable = false)
    private HomepageProductSection section;

    /**
     * The product shown in this slot.  Not cascaded — the slot is simply removed if the product
     * is hard-deleted via the admin product-delete flow (handled by service-layer checks or DB FK).
     * We use RESTRICT / NO ACTION at the DB level by default; the service explicitly handles the
     * case where a slot references a product that no longer exists.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private int displayOrder = 0;

    @Column(nullable = false)
    @Builder.Default
    private boolean enabled = true;
}
