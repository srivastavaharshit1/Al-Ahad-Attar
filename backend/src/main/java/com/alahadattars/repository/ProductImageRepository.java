package com.alahadattars.repository;

import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductImageRepository extends JpaRepository<ProductImage, Long> {
    List<ProductImage> findByProductAndActiveTrueOrderByDisplayOrderAsc(Product product);
    List<ProductImage> findByProductAndIsPrimaryAndActiveTrue(Product product, boolean isPrimary);
    int countByProductAndActiveTrue(Product product);

    /**
     * Fetch active images whose altText matches the given productType tag
     * (e.g. "ATTAR", "PERFUME"). Used for per-type gallery and per-type count limits.
     */
    List<ProductImage> findByProductAndAltTextAndActiveTrueOrderByDisplayOrderAsc(Product product, String altText);

    /**
     * Count active images with a given type tag. Used to enforce the per-type 10-image limit.
     */
    int countByProductAndAltTextAndActiveTrue(Product product, String altText);
}
