package com.alahadattars.repository;

import com.alahadattars.entity.HelpfulVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface HelpfulVoteRepository extends JpaRepository<HelpfulVote, Long> {
    Optional<HelpfulVote> findByReviewIdAndUserId(Long reviewId, Long userId);
    long countByReviewId(Long reviewId);
    boolean existsByReviewIdAndUserId(Long reviewId, Long userId);

    @Query("SELECT hv.review.id, COUNT(hv) FROM HelpfulVote hv WHERE hv.review.id IN :reviewIds GROUP BY hv.review.id")
    List<Object[]> countByReviewIds(@Param("reviewIds") Collection<Long> reviewIds);

    @Query("SELECT hv.review.id FROM HelpfulVote hv WHERE hv.review.id IN :reviewIds AND hv.user.id = :userId")
    Set<Long> findVotedReviewIds(@Param("reviewIds") Collection<Long> reviewIds, @Param("userId") Long userId);
}
