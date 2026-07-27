package com.alahadattars.service.impl;

import com.alahadattars.dto.review.ReportReviewRequest;
import com.alahadattars.dto.review.ReviewRequest;
import com.alahadattars.dto.review.ReviewResponse;
import com.alahadattars.dto.review.ReviewSummaryResponse;
import com.alahadattars.entity.HelpfulVote;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.Review;
import com.alahadattars.entity.ReviewImage;
import com.alahadattars.entity.ReviewReport;
import com.alahadattars.entity.User;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.exception.UnauthorizedException;
import com.alahadattars.repository.HelpfulVoteRepository;
import com.alahadattars.repository.OrderRepository;
import com.alahadattars.repository.ProductRepository;
import com.alahadattars.repository.ReviewReportRepository;
import com.alahadattars.repository.ReviewRepository;
import com.alahadattars.repository.UserRepository;
import com.alahadattars.service.UploadService;
import com.alahadattars.service.ReviewService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final HelpfulVoteRepository helpfulVoteRepository;
    private final ReviewReportRepository reviewReportRepository;
    private final UploadService fileStorageService;

    @Override
    @Transactional
    public ReviewResponse createReview(String email, ReviewRequest request) {
        User user = getUserByEmail(email);
        Product product = getProductById(request.getProductId());

        if (reviewRepository.existsByProductIdAndUserId(product.getId(), user.getId())) {
            throw new IllegalArgumentException("You have already reviewed this product.");
        }

        boolean isVerified = orderRepository.hasUserPurchasedProduct(user.getId(), product.getId());

        Review review = Review.builder()
                .product(product)
                .user(user)
                .rating(request.getRating())
                .title(request.getTitle())
                .description(request.getDescription())
                .isVerifiedPurchase(isVerified)
                .build();

        review = reviewRepository.save(review);
        updateProductRating(product);

        return mapToResponse(review, user);
    }

    @Override
    @Transactional
    public ReviewResponse updateReview(String email, Long id, ReviewRequest request) {
        User user = getUserByEmail(email);
        Review review = getReviewById(id);

        if (!review.getUser().getId().equals(user.getId())) {
            throw new UnauthorizedException("You can only edit your own reviews.");
        }

        review.setRating(request.getRating());
        review.setTitle(request.getTitle());
        review.setDescription(request.getDescription());
        
        review = reviewRepository.save(review);
        updateProductRating(review.getProduct());

        return mapToResponse(review, user);
    }

    @Override
    @Transactional
    public void deleteReview(String email, Long id) {
        User user = getUserByEmail(email);
        Review review = getReviewById(id);

        if (!review.getUser().getId().equals(user.getId())) {
            throw new UnauthorizedException("You can only delete your own reviews.");
        }

        Product product = review.getProduct();
        
        // Delete images
        for (ReviewImage img : review.getImages()) {
            fileStorageService.deleteFile(img.getImageUrl());
        }

        reviewRepository.delete(review);
        updateProductRating(product);
    }

    @Override
    public Page<ReviewResponse> getProductReviews(Long productId, Integer rating, String email, Pageable pageable) {
        User currentUser = email != null ? userRepository.findByEmail(email).orElse(null) : null;

        // "Most Helpful" sort cannot be expressed as a Pageable sort property because
        // helpfulVotesCount is not a column on the review table — it's a count from helpful_vote.
        // Detect this sort and route to a dedicated custom JPQL query.
        boolean sortByHelpful = pageable.getSort().stream()
                .anyMatch(order -> "helpfulVotesCount".equals(order.getProperty()));

        Page<Review> reviews;
        if (sortByHelpful) {
            // Use an unpaged pageable (page/size preserved, sort handled by query)
            org.springframework.data.domain.PageRequest pageRequest =
                    org.springframework.data.domain.PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
            if (rating != null) {
                reviews = reviewRepository.findByProductIdAndRatingAndIsHiddenFalseOrderByHelpfulVotesDesc(productId, rating, pageRequest);
            } else {
                reviews = reviewRepository.findByProductIdAndIsHiddenFalseOrderByHelpfulVotesDesc(productId, pageRequest);
            }
        } else if (rating != null) {
            reviews = reviewRepository.findByProductIdAndRatingAndIsHiddenFalse(productId, rating, pageable);
        } else {
            reviews = reviewRepository.findByProductIdAndIsHiddenFalse(productId, pageable);
        }

        return reviews.map(review -> mapToResponse(review, currentUser));
    }

    @Override
    public ReviewSummaryResponse getProductReviewSummary(Long productId) {
        Product product = getProductById(productId);
        
        // Fetch all non-hidden reviews to calculate distribution
        // For larger scales, this could be optimized into a native group-by query.
        List<Review> reviews = product.getReviews().stream().filter(r -> !r.isHidden()).toList();
        
        Map<Integer, Long> distribution = new HashMap<>();
        for (int i = 1; i <= 5; i++) {
            distribution.put(i, 0L);
        }
        
        for (Review r : reviews) {
            distribution.put(r.getRating(), distribution.getOrDefault(r.getRating(), 0L) + 1);
        }
        
        return ReviewSummaryResponse.builder()
                .productId(productId)
                .averageRating(product.getAverageRating())
                .totalReviews(product.getReviewCount())
                .ratingDistribution(distribution)
                .build();
    }

    @Override
    @Transactional
    public ReviewResponse toggleHelpfulVote(String email, Long id) {
        User user = getUserByEmail(email);
        Review review = getReviewById(id);

        Optional<HelpfulVote> existingVote = helpfulVoteRepository.findByReviewIdAndUserId(review.getId(), user.getId());

        if (existingVote.isPresent()) {
            helpfulVoteRepository.delete(existingVote.get());
            helpfulVoteRepository.flush(); // Ensure deletion is committed before count query
        } else {
            HelpfulVote vote = HelpfulVote.builder()
                    .review(review)
                    .user(user)
                    .build();
            helpfulVoteRepository.saveAndFlush(vote); // Ensure insert is committed before count query
        }

        return mapToResponse(review, user);
    }

    @Override
    @Transactional
    public void reportReview(String email, Long id, ReportReviewRequest request) {
        Review review = getReviewById(id);
        User user = email != null ? userRepository.findByEmail(email).orElse(null) : null;
        
        ReviewReport report = ReviewReport.builder()
                .review(review)
                .user(user)
                .reason(request.getReason())
                .build();
                
        reviewReportRepository.save(report);
    }

    @Override
    @Transactional
    public ReviewResponse uploadReviewImages(String email, Long id, List<MultipartFile> files) {
        User user = getUserByEmail(email);
        Review review = getReviewById(id);

        if (!review.getUser().getId().equals(user.getId())) {
            throw new UnauthorizedException("You can only edit your own reviews.");
        }
        
        if (review.getImages().size() + files.size() > 5) {
            throw new IllegalArgumentException("Maximum of 5 images allowed per review.");
        }

        for (MultipartFile file : files) {
            String imageUrl = fileStorageService.uploadFile(file, "uploads/reviews");
            ReviewImage reviewImage = ReviewImage.builder()
                    .review(review)
                    .imageUrl(imageUrl)
                    .build();
            review.getImages().add(reviewImage);
        }

        review = reviewRepository.save(review);
        return mapToResponse(review, user);
    }

    @Override
    public Page<ReviewResponse> getAllReviews(String search, Pageable pageable) {
        // Simple un-optimized list for admin. In production, add specifications for robust search
        return reviewRepository.findAll(pageable).map(r -> mapToResponse(r, null));
    }

    @Override
    @Transactional
    public ReviewResponse toggleVisibility(Long id, boolean hide) {
        Review review = getReviewById(id);
        review.setHidden(hide);
        review = reviewRepository.save(review);
        updateProductRating(review.getProduct());
        return mapToResponse(review, null);
    }

    @Override
    @Transactional
    public ReviewResponse adminReply(Long id, String reply) {
        Review review = getReviewById(id);
        review.setAdminReply(reply);
        review = reviewRepository.save(review);
        return mapToResponse(review, null);
    }

    @Override
    @Transactional
    public void adminDeleteReview(Long id) {
        Review review = getReviewById(id);
        Product product = review.getProduct();
        
        for (ReviewImage img : review.getImages()) {
            fileStorageService.deleteFile(img.getImageUrl());
        }
        
        reviewRepository.delete(review);
        updateProductRating(product);
    }
    
    // --- Helper Methods ---

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Review getReviewById(Long id) {
        return reviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
    }

    private Product getProductById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
    }

    private void updateProductRating(Product product) {
        Double avg = reviewRepository.getAverageRatingByProductId(product.getId());
        long count = reviewRepository.countVisibleReviewsByProductId(product.getId());
        
        product.setAverageRating(avg != null ? avg : 0.0);
        product.setReviewCount((int) count);
        productRepository.save(product);
    }

    private ReviewResponse mapToResponse(Review review, User currentUser) {
        // Always query the DB directly for vote status — never rely on the in-memory
        // helpfulVotes collection which may be stale (e.g. after toggle within the same transaction).
        boolean currentUserVoted = currentUser != null
                && helpfulVoteRepository.existsByReviewIdAndUserId(review.getId(), currentUser.getId());

        List<String> images = review.getImages() != null ?
                review.getImages().stream()
                    .map(img -> img.getImageUrl() != null ? "/api/reviews/images/" + img.getId() + "/file" : null)
                    .filter(java.util.Objects::nonNull)
                    .collect(Collectors.toList()) :
                new ArrayList<>();

        return ReviewResponse.builder()
                .id(review.getId())
                .productId(review.getProduct().getId())
                .userId(review.getUser().getId())
                .userName(review.getUser().getFirstName() + " " + review.getUser().getLastName())
                .rating(review.getRating())
                .title(review.getTitle())
                .description(review.getDescription())
                .isVerifiedPurchase(review.isVerifiedPurchase())
                .isHidden(review.isHidden())
                .adminReply(review.getAdminReply())
                .imageUrls(images)
                .helpfulVotesCount(helpfulVoteRepository.countByReviewId(review.getId()))
                .currentUserVotedHelpful(currentUserVoted)
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }
}
