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

@Repository
public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {
    Optional<Product> findBySlug(String slug);
    boolean existsBySlug(String slug);
    List<Product> findByCategory(Category category);
    List<Product> findByFeaturedTrue();
    List<Product> findByActiveTrue();
    List<Product> findByBrand(String brand);
    List<Product> findByGender(Gender gender);
    
    // For related products
    Page<Product> findByCategoryAndIdNotAndActiveTrue(Category category, Long id, org.springframework.data.domain.Pageable pageable);
    Page<Product> findByFragranceFamilyAndIdNotAndActiveTrue(String fragranceFamily, Long id, org.springframework.data.domain.Pageable pageable);
    @org.springframework.data.jpa.repository.Query("SELECT p FROM Product p WHERE p.id != :id AND p.active = true ORDER BY p.averageRating DESC, p.reviewCount DESC")
    Page<Product> findTopRatedProducts(Long id, org.springframework.data.domain.Pageable pageable);
}
