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
    name = "homepage_section",
    indexes = {
        @Index(name = "idx_homepage_section_key", columnList = "section_key", unique = true),
        @Index(name = "idx_homepage_section_display_order", columnList = "display_order")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(callSuper = true)
public class HomepageSection extends BaseEntity {

    @Column(name = "section_key", length = 50, nullable = false, unique = true)
    private String sectionKey;

    @Column(length = 200)
    private String title;

    @Column(length = 500)
    private String subtitle;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private boolean visible = true;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private int displayOrder = 0;

    @Column(name = "max_items")
    private Integer maxItems;
}
