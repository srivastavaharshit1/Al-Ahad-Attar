package com.alahadattars.dto.review;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewSummaryResponse {
    private Long productId;
    private Double averageRating;
    private long totalReviews;
    private Map<Integer, Long> ratingDistribution; // 1-5 stars and count for each
}
