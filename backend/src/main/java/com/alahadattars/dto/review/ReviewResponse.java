package com.alahadattars.dto.review;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {
    private Long id;
    private Long productId;
    private Long userId;
    private String userName; // First + Last name
    private Integer rating;
    private String title;
    private String description;
    private boolean isVerifiedPurchase;
    private boolean isHidden;
    private String adminReply;
    private List<String> imageUrls;
    private long helpfulVotesCount;
    private boolean currentUserVotedHelpful;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
