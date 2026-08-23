package com.alahadattars.repository;

import com.alahadattars.entity.Category;
import com.alahadattars.entity.Product;
import com.alahadattars.enums.Gender;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {
    @EntityGraph(attributePaths = {"category"})
    Optional<Product> findBySlug(String slug);
    boolean existsBySlug(String slug);

    // Unfiltered on purpose — CategoryServiceImpl uses this to check "does this category still
    // have ANY products" (active or not) before allowing a category delete, since an inactive
    // product row still holds a real FK to it. Public-facing category browsing uses the
    // *AndActiveTrue variant below instead.
    List<Product> findByCategory(Category category);
    @EntityGraph(attributePaths = {"category"})
    List<Product> findByCategoryAndActiveTrue(Category category);
    // Featured products are surfaced on the public homepage — deactivated ones must never appear
    // there just because they were once marked featured.
    @EntityGraph(attributePaths = {"category"})
    List<Product> findByFeaturedTrueAndActiveTrue();
    @EntityGraph(attributePaths = {"category"})
    List<Product> findByActiveTrue();
    List<Product> findByBrand(String brand);
    List<Product> findByGender(Gender gender);
    
    // For related products
    Page<Product> findByCategoryAndIdNotAndActiveTrue(Category category, Long id, org.springframework.data.domain.Pageable pageable);
    Page<Product> findByFragranceFamilyAndIdNotAndActiveTrue(String fragranceFamily, Long id, org.springframework.data.domain.Pageable pageable);
    @org.springframework.data.jpa.repository.Query("SELECT p FROM Product p WHERE p.id != :id AND p.active = true ORDER BY p.averageRating DESC, p.reviewCount DESC")
    Page<Product> findTopRatedProducts(Long id, org.springframework.data.domain.Pageable pageable);
}
