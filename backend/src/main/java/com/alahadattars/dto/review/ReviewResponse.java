package com.alahadattars.dto.review;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
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

    // See ProductImageResponse.isPrimary for why: Lombok's isXxx() getter for an
    // already-"is"-prefixed field collides with Jackson's is-stripping rule and would
    // serialize as "verifiedPurchase"/"hidden" instead of "isVerifiedPurchase"/"isHidden",
    // which is what the frontend (types/review.ts) actually reads.
    @Getter(AccessLevel.NONE)
    private boolean isVerifiedPurchase;
    @Getter(AccessLevel.NONE)
    private boolean isHidden;

    private String adminReply;
    private List<String> imageUrls;
    private long helpfulVotesCount;
    private boolean currentUserVotedHelpful;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public boolean getIsVerifiedPurchase() {
        return isVerifiedPurchase;
    }

    public boolean getIsHidden() {
        return isHidden;
    }
}
