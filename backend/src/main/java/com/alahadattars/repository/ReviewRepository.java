package com.alahadattars.repository;

import com.alahadattars.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    @EntityGraph(attributePaths = {"user"})
    Page<Review> findByProductIdAndIsHiddenFalse(Long productId, Pageable pageable);

    @EntityGraph(attributePaths = {"user"})
    Page<Review> findByProductIdAndRatingAndIsHiddenFalse(Long productId, Integer rating, Pageable pageable);

    boolean existsByProductIdAndUserId(Long productId, Long userId);

    @Query("SELECT COUNT(r) FROM Review r WHERE r.product.id = :productId AND r.isHidden = false")
    long countVisibleReviewsByProductId(@Param("productId") Long productId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.product.id = :productId AND r.isHidden = false")
    Double getAverageRatingByProductId(@Param("productId") Long productId);

    @Query("SELECT r.rating, COUNT(r) FROM Review r WHERE r.product.id = :productId AND r.isHidden = false GROUP BY r.rating")
    List<Object[]> getRatingDistributionByProductId(@Param("productId") Long productId);

    /**
     * Sort by helpful vote count (subquery) — used for "Most Helpful" sort option.
     * Spring Pageable cannot sort on derived/computed fields outside the entity, so we use a custom query.
     */
    @EntityGraph(attributePaths = {"user"})
    @Query("SELECT r FROM Review r WHERE r.product.id = :productId AND r.isHidden = false " +
           "ORDER BY (SELECT COUNT(hv) FROM HelpfulVote hv WHERE hv.review = r) DESC")
    Page<Review> findByProductIdAndIsHiddenFalseOrderByHelpfulVotesDesc(@Param("productId") Long productId, Pageable pageable);

    @EntityGraph(attributePaths = {"user"})
    @Query("SELECT r FROM Review r WHERE r.product.id = :productId AND r.rating = :rating AND r.isHidden = false " +
           "ORDER BY (SELECT COUNT(hv) FROM HelpfulVote hv WHERE hv.review = r) DESC")
    Page<Review> findByProductIdAndRatingAndIsHiddenFalseOrderByHelpfulVotesDesc(@Param("productId") Long productId, @Param("rating") Integer rating, Pageable pageable);
}
