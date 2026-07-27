package com.alahadattars.config;

import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductImage;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.repository.ProductImageRepository;
import com.alahadattars.repository.ProductRepository;
import com.alahadattars.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ImageMigrationRunner implements CommandLineRunner {

    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;
    private final ProductImageRepository imageRepository;
    private final JdbcTemplate jdbcTemplate;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        log.info("Checking and fixing database schema for product_image...");
        try {
            // Drop legacy cloudinary_public_id column
            log.info("Checking for legacy Cloudinary columns...");
            int legacyColCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns " +
                "WHERE table_schema = DATABASE() " +
                "AND table_name = 'product_image' " +
                "AND column_name = 'cloudinary_public_id'", Integer.class);

            if (legacyColCount > 0) {
                log.info("Removing legacy cloudinary_public_id column from product_image table...");
                jdbcTemplate.execute("ALTER TABLE product_image DROP COLUMN cloudinary_public_id");
                log.info("Successfully removed legacy cloudinary_public_id column");
            }
            jdbcTemplate.execute("ALTER TABLE product_image MODIFY COLUMN content_type VARCHAR(255) NULL");
            jdbcTemplate.execute("ALTER TABLE product_image MODIFY COLUMN file_name VARCHAR(255) NULL");
            jdbcTemplate.execute("ALTER TABLE product_image MODIFY COLUMN original_file_name VARCHAR(255) NULL");
            jdbcTemplate.execute("ALTER TABLE product_image MODIFY COLUMN file_size BIGINT NULL");
            jdbcTemplate.execute("ALTER TABLE product_image MODIFY COLUMN image_type ENUM('GALLERY', 'HERO', 'THUMBNAIL') NULL");
            jdbcTemplate.execute("ALTER TABLE product_image MODIFY COLUMN variant_id BIGINT NULL");
            jdbcTemplate.execute("ALTER TABLE product_image MODIFY COLUMN file_path VARCHAR(255) NULL");
        } catch (Exception e) {
            log.warn("Could not alter table, might already be updated or columns missing: {}", e.getMessage());
        }

        log.info("Starting Product Image migration check...");
        
        List<Product> products = productRepository.findAll();
        int migratedProducts = 0;
        int migratedImages = 0;

        for (Product product : products) {
            // Check if product already has images in the new table
            if (imageRepository.countByProductAndActiveTrue(product) == 0) {
                // Find variants that have the legacy 'image' field
                List<ProductVariant> variants = variantRepository.findByProduct(product);
                
                boolean primarySet = false;
                
                for (ProductVariant variant : variants) {
                    if (variant.isActive() && variant.getImage() != null && !variant.getImage().trim().isEmpty()) {
                        // Extract URL
                        String imageUrl = variant.getImage();
                        
                        ProductImage newImage = ProductImage.builder()
                                .product(product)
                                .imageUrl(imageUrl)
                                .displayOrder(migratedImages)
                                .isPrimary(!primarySet)
                                .active(true)
                                .build();
                                
                        imageRepository.save(newImage);
                        product.addImage(newImage);
                        primarySet = true;
                        migratedImages++;
                    }
                }
                
                if (primarySet) {
                    productRepository.save(product);
                    migratedProducts++;
                }
            }
        }
        
        if (migratedProducts > 0) {
            log.info("Migration Complete! Migrated {} legacy images across {} products.", migratedImages, migratedProducts);
        } else {
            log.info("No legacy images required migration.");
        }
    }
}
