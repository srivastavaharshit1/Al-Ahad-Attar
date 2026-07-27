package com.alahadattars.repository;

import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductImageRepository extends JpaRepository<ProductImage, Long> {
    List<ProductImage> findByProductAndActiveTrueOrderByDisplayOrderAsc(Product product);
    Optional<ProductImage> findByProductAndIsPrimaryAndActiveTrue(Product product, boolean isPrimary);
    int countByProductAndActiveTrue(Product product);
}
