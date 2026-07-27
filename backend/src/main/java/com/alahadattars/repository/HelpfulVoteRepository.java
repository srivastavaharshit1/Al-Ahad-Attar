package com.alahadattars.repository;

import com.alahadattars.entity.HelpfulVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HelpfulVoteRepository extends JpaRepository<HelpfulVote, Long> {
    Optional<HelpfulVote> findByReviewIdAndUserId(Long reviewId, Long userId);
    long countByReviewId(Long reviewId);
    boolean existsByReviewIdAndUserId(Long reviewId, Long userId);
}
