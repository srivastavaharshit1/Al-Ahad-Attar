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

    @org.springframework.data.jpa.repository.Query("""
            SELECT v FROM ProductVariant v
            JOIN FETCH v.product p
            JOIN FETCH p.category c
            WHERE v.active = true
              AND v.stock > 0
              AND p.active = true
              AND c.id IN :categoryIds
              AND LOWER(v.size) = LOWER(:size)
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
}
