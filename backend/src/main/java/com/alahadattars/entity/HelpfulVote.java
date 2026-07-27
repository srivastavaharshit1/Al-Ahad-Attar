package com.alahadattars.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "helpful_vote",
    uniqueConstraints = @UniqueConstraint(columnNames = {"review_id", "user_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HelpfulVote extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "review_id", nullable = false)
    private Review review;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}
