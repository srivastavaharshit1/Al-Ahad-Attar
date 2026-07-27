package com.alahadattars.seeder;

import com.alahadattars.entity.Category;
import com.alahadattars.entity.HomepageSection;
import com.alahadattars.entity.Role;
import com.alahadattars.entity.User;
import com.alahadattars.enums.CategoryType;
import com.alahadattars.enums.RoleType;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.HomepageSectionRepository;
import com.alahadattars.repository.RoleRepository;
import com.alahadattars.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final HomepageSectionRepository homepageSectionRepository;
    private final PasswordEncoder passwordEncoder;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Value("${app.admin.email:admin@alahadattars.com}")
    private String adminEmail;

    @Value("${app.admin.password:Admin@123}")
    private String adminPassword;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Running Data Seeder...");

        // 1. Seed Roles
        Role userRole = roleRepository.findByName(RoleType.USER).orElseGet(() -> {
            log.info("Creating default USER role");
            return roleRepository.save(Role.builder()
                    .name(RoleType.USER)
                    .description("Standard User Role")
                    .active(true)
                    .build());
        });

        Role adminRole = roleRepository.findByName(RoleType.ADMIN).orElseGet(() -> {
            log.info("Creating default ADMIN role");
            return roleRepository.save(Role.builder()
                    .name(RoleType.ADMIN)
                    .description("Administrator Role")
                    .active(true)
                    .build());
        });


        // 2. Seed Default Admin Account
        if (!userRepository.existsByEmail(adminEmail)) {
            log.info("Creating default Admin account: {}", adminEmail);
            User admin = User.builder()
                    .firstName("Super")
                    .lastName("Admin")
                    .email(adminEmail)
                    .phone("+10000000000")
                    .password(passwordEncoder.encode(adminPassword))
                    .enabled(true)
                    .emailVerified(true)
                    .phoneVerified(true)
                    .build();

            adminRole.addUser(admin);
            userRepository.save(admin);
            log.info("Admin account created successfully.");
        } else {
            log.info("Admin account already exists. Skipping creation.");
        }
        
        // 3. Seed Default Categories
        log.info("Checking default Categories");
        
        if (!categoryRepository.existsByType(CategoryType.ATTARS)) {
            Category attars = Category.builder()
                    .name("Attars")
                    .description("Premium concentrated perfume oils")
                    .image("attars_placeholder.jpg")
                    .active(true)
                    .type(CategoryType.ATTARS)
                    .build();
            categoryRepository.save(attars);
            log.info("Seeded Attars category.");
        }

        if (!categoryRepository.existsByType(CategoryType.BAKHOOR)) {
            Category bakhoor = Category.builder()
                    .name("Bakhoor")
                    .description("Authentic Arabic incense")
                    .image("bakhoor_placeholder.jpg")
                    .active(true)
                    .type(CategoryType.BAKHOOR)
                    .build();
            categoryRepository.save(bakhoor);
            log.info("Seeded Bakhoor category.");
        }

        if (!categoryRepository.existsByType(CategoryType.PERFUMES)) {
            Category perfumes = Category.builder()
                    .name("Perfumes")
                    .description("Exquisite spray perfumes")
                    .image("perfumes_placeholder.jpg")
                    .active(true)
                    .type(CategoryType.PERFUMES)
                    .build();
            categoryRepository.save(perfumes);
            log.info("Seeded Perfumes category.");
        }
        try {
            jdbcTemplate.execute("INSERT INTO product_collections (product_id, collection_name) SELECT p.id, 'COLLECTIONS' FROM product p WHERE NOT EXISTS (SELECT 1 FROM product_collections pc WHERE pc.product_id = p.id AND pc.collection_name = 'COLLECTIONS')");
            log.info("Migrated existing products to feature in Collections.");
        } catch (Exception e) {
            log.warn("Could not migrate collections: {}", e.getMessage());
        }

        // Migrate Gender
        try {
            jdbcTemplate.execute("UPDATE product SET gender = 'UNISEX' WHERE gender IS NULL OR gender = ''");
        } catch (Exception e) {
            log.warn("Could not migrate gender: {}", e.getMessage());
        }

        // Migrate Car Perfumes to Bakhoor -> Fresheners
        try {
            jdbcTemplate.execute(
                "UPDATE product p " +
                "JOIN category c_old ON p.category_id = c_old.id " +
                "JOIN category c_new ON c_new.type = 'BAKHOOR' " +
                "SET p.category_id = c_new.id, p.subcategory = 'FRESHENERS' " +
                "WHERE c_old.type = 'CAR_PERFUMES'"
            );
            jdbcTemplate.execute("DELETE FROM category WHERE type = 'CAR_PERFUMES'");
            log.info("Migrated Car Perfumes to Bakhoor/Fresheners.");
        } catch (Exception e) {
            log.warn("Could not migrate Car Perfumes: {}", e.getMessage());
        }

        // Cleanup broken legacy absolute paths for images to fix frontend broken icons
        try {
            int deletedImages = jdbcTemplate.update("DELETE FROM product_image");
            log.info("Cleaned up {} legacy paths from product_image (cleared table)", deletedImages);
            
            // Re-assign primary image for products that lost it
            jdbcTemplate.execute(
                "UPDATE product_image pi1 " +
                "JOIN (SELECT product_id, MIN(id) as first_id FROM product_image GROUP BY product_id) pi2 " +
                "ON pi1.id = pi2.first_id " +
                "SET pi1.is_primary = 1 " +
                "WHERE NOT EXISTS (SELECT 1 FROM (SELECT * FROM product_image) pi3 WHERE pi3.product_id = pi1.product_id AND pi3.is_primary = 1)"
            );
            log.info("Re-assigned primary images to fix missing thumbnails.");
        } catch (Exception e) {
            log.warn("Could not cleanup broken legacy images: {}", e.getMessage());
        }

        // 4. Seed Default Homepage Sections
        log.info("Checking default Homepage Sections");
        String[] sections = {"hero", "promo_banners", "categories", "featured_products", "offers", "testimonials", "why_choose_us", "newsletter"};
        String[] titles = {"Hero", "Promotional Banners", "Categories", "Featured Products", "Offers", "Testimonials", "Why Choose Us", "Newsletter"};
        for (int i = 0; i < sections.length; i++) {
            final String key = sections[i];
            final String title = titles[i];
            final int index = i;
            if (homepageSectionRepository.findBySectionKey(key).isEmpty()) {
                homepageSectionRepository.save(HomepageSection.builder()
                        .sectionKey(key)
                        .title(title)
                        .visible(true)
                        .displayOrder(index)
                        .maxItems(key.equals("categories") ? Integer.valueOf(4) : (key.equals("featured_products") ? Integer.valueOf(8) : null))
                        .build());
                log.info("Seeded Homepage Section: {}", key);
            }
        }

        log.info("Data Seeding completed.");
    }
}
