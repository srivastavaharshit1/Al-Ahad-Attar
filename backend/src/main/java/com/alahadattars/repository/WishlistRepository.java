package com.alahadattars.repository;

import com.alahadattars.entity.WishlistItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WishlistRepository extends JpaRepository<WishlistItem, Long> {
    
    List<WishlistItem> findByUserEmailOrderByCreatedAtDesc(String email);
    
    Optional<WishlistItem> findByUserEmailAndVariantId(String email, Long variantId);
    
    boolean existsByUserEmailAndVariantId(String email, Long variantId);
}
