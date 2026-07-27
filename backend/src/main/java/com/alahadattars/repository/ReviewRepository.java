package com.alahadattars.repository;

import com.alahadattars.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    Page<Review> findByProductIdAndIsHiddenFalse(Long productId, Pageable pageable);

    Page<Review> findByProductIdAndRatingAndIsHiddenFalse(Long productId, Integer rating, Pageable pageable);

    boolean existsByProductIdAndUserId(Long productId, Long userId);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.product.id = :productId AND r.isHidden = false")
    long countVisibleReviewsByProductId(Long productId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.product.id = :productId AND r.isHidden = false")
    Double getAverageRatingByProductId(Long productId);

    /**
     * Sort by helpful vote count (subquery) — used for "Most Helpful" sort option.
     * Spring Pageable cannot sort on derived/computed fields outside the entity, so we use a custom query.
     */
    @Query("SELECT r FROM Review r WHERE r.product.id = :productId AND r.isHidden = false " +
           "ORDER BY (SELECT COUNT(hv) FROM HelpfulVote hv WHERE hv.review = r) DESC")
    Page<Review> findByProductIdAndIsHiddenFalseOrderByHelpfulVotesDesc(Long productId, Pageable pageable);

    @Query("SELECT r FROM Review r WHERE r.product.id = :productId AND r.rating = :rating AND r.isHidden = false " +
           "ORDER BY (SELECT COUNT(hv) FROM HelpfulVote hv WHERE hv.review = r) DESC")
    Page<Review> findByProductIdAndRatingAndIsHiddenFalseOrderByHelpfulVotesDesc(Long productId, Integer rating, Pageable pageable);
}
