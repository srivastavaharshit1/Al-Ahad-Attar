package com.alahadattars.repository;

import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {
    List<ProductVariant> findByProduct(Product product);
    Optional<ProductVariant> findBySku(String sku);
    boolean existsBySku(String sku);
    List<ProductVariant> findByActiveTrue();

    // Size match ignores case AND spaces (REPLACE(..., ' ', '')) — variant sizes are entered as
    // free text ("3ml" vs "3 ml") with no canonical stored format, and an exact LOWER()-only match
    // made this promotion path silently return zero eligible products over a single stray space,
    // with no error surfaced anywhere (see ProductVariantServiceImpl.validateVariantSize, which
    // already normalizes the same way when validating new variant sizes).
    @org.springframework.data.jpa.repository.Query("""
            SELECT v FROM ProductVariant v
            JOIN FETCH v.product p
            JOIN FETCH p.category c
            WHERE v.active = true
              AND v.stock > 0
              AND p.active = true
              AND c.id IN :categoryIds
              AND REPLACE(LOWER(v.size), ' ', '') = REPLACE(LOWER(:size), ' ', '')
            """)
    List<ProductVariant> findEligibleFreeVariants(
            @org.springframework.data.repository.query.Param("categoryIds") List<Long> categoryIds,
            @org.springframework.data.repository.query.Param("size") String size);

    @org.springframework.data.jpa.repository.Query("""
            SELECT v FROM ProductVariant v
            JOIN FETCH v.product p
            JOIN FETCH p.category c
            WHERE v.active = true
              AND v.stock > 0
              AND p.active = true
              AND v.id IN :variantIds
            """)
    List<ProductVariant> findEligibleFreeVariantsByIds(
            @org.springframework.data.repository.query.Param("variantIds") List<Long> variantIds);

    // Scope-aware variants of the two queries above, minus the size predicate — size filtering
    // for these is done once in Java (PromotionEngineServiceImpl.sizeMatches) rather than adding a
    // JPQL variant per scope, since CATEGORY/SPECIFIC_PRODUCT/ANY_PRODUCT scopes all need the same
    // size-matching afterward regardless of how the candidate list was narrowed.
    @org.springframework.data.jpa.repository.Query("""
            SELECT v FROM ProductVariant v
            JOIN FETCH v.product p
            JOIN FETCH p.category c
            WHERE v.active = true
              AND v.stock > 0
              AND p.active = true
              AND c.id IN :categoryIds
            """)
    List<ProductVariant> findEligibleVariantsByCategories(
            @org.springframework.data.repository.query.Param("categoryIds") List<Long> categoryIds);

    @org.springframework.data.jpa.repository.Query("""
            SELECT v FROM ProductVariant v
            JOIN FETCH v.product p
            JOIN FETCH p.category c
            WHERE v.active = true
              AND v.stock > 0
              AND p.active = true
              AND p.id IN :productIds
            """)
    List<ProductVariant> findEligibleVariantsByProducts(
            @org.springframework.data.repository.query.Param("productIds") List<Long> productIds);

    @org.springframework.data.jpa.repository.Query("""
            SELECT v FROM ProductVariant v
            JOIN FETCH v.product p
            WHERE v.active = true AND v.stock < :threshold
            ORDER BY v.stock ASC
            """)
    List<ProductVariant> findLowStock(
            @org.springframework.data.repository.query.Param("threshold") int threshold,
            org.springframework.data.domain.Pageable pageable);

    /**
     * Atomically decrements stock, only if enough is available — the real guard against
     * overselling under concurrent checkouts (a plain read-modify-write can lose an update
     * between two simultaneous buyers of the last units). Returns 0 (no row matched) if stock is
     * insufficient at the moment of the UPDATE, which the caller must treat as a hard failure,
     * not just the earlier friendly pre-check.
     */
    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query(
            "UPDATE ProductVariant v SET v.stock = v.stock - :quantity WHERE v.id = :id AND v.stock >= :quantity")
    int decrementStock(@org.springframework.data.repository.query.Param("id") Long id,
                        @org.springframework.data.repository.query.Param("quantity") int quantity);

    /** Atomic counterpart to {@link #decrementStock} for restoring inventory (cancellations/refunds). */
    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true)
    @org.springframework.data.jpa.repository.Query("UPDATE ProductVariant v SET v.stock = v.stock + :quantity WHERE v.id = :id")
    int incrementStock(@org.springframework.data.repository.query.Param("id") Long id,
                        @org.springframework.data.repository.query.Param("quantity") int quantity);
}
