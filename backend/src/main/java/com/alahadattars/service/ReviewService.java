package com.alahadattars.service;

import com.alahadattars.dto.review.ReportReviewRequest;
import com.alahadattars.dto.review.ReviewRequest;
import com.alahadattars.dto.review.ReviewResponse;
import com.alahadattars.dto.review.ReviewSummaryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ReviewService {

    // Customer Methods
    ReviewResponse createReview(String email, ReviewRequest request);
    ReviewResponse updateReview(String email, Long id, ReviewRequest request);
    void deleteReview(String email, Long id);
    
    Page<ReviewResponse> getProductReviews(Long productId, Integer rating, String email, Pageable pageable);
    ReviewSummaryResponse getProductReviewSummary(Long productId);
    
    ReviewResponse toggleHelpfulVote(String email, Long id);
    void reportReview(String email, Long id, ReportReviewRequest request);
    
    ReviewResponse uploadReviewImages(String email, Long id, List<MultipartFile> files);

    // Admin Methods
    Page<ReviewResponse> getAllReviews(String search, Pageable pageable);
    ReviewResponse toggleVisibility(Long id, boolean hide);
    ReviewResponse adminReply(Long id, String reply);
    void adminDeleteReview(Long id);
}
