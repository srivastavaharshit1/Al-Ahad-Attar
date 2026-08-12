package com.alahadattars.entity;

import com.alahadattars.enums.ReportStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "review_report", indexes = {
    @Index(name = "idx_review_report_review_id", columnList = "review_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewReport extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "review_id", nullable = false)
    private Review review;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id") // Nullable for guest reports
    private User user;

    @Column(nullable = false)
    private String reason;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportStatus status = ReportStatus.PENDING;
}
