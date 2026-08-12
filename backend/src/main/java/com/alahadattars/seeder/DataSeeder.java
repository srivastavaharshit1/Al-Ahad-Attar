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
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds structural data (roles, bootstrap admin, categories, homepage section toggles).
 * Runs before {@link CatalogSeeder}, which depends on the categories/roles created here.
 */
@Component
@RequiredArgsConstructor
@Order(1)
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final HomepageSectionRepository homepageSectionRepository;
    private final PasswordEncoder passwordEncoder;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    // No fallback values here either — the annotation default would otherwise resurrect the
    // hard-coded credentials even after they were removed from application.yml.
    @Value("${app.admin.email:}")
    private String adminEmail;

    @Value("${app.admin.password:}")
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


        // 2. Seed Bootstrap Admin Account — only when credentials were supplied by the operator.
        // Seeding a default account here would mean every deployment ships a live admin login
        // whose password is public knowledge.
        if (adminEmail == null || adminEmail.isBlank() || adminPassword == null || adminPassword.isBlank()) {
            log.warn("ADMIN_EMAIL/ADMIN_PASSWORD not configured — skipping bootstrap admin account. "
                    + "Set both environment variables to seed one.");
        } else if (!userRepository.existsByEmail(adminEmail)) {
            log.info("Creating default Admin account: {}", adminEmail);
            User admin = User.builder()
                    .firstName("Super")
                    .lastName("Admin")
                    .email(adminEmail)
                    // Must be a genuinely valid E.164 number, not just a plausible-looking one —
                    // @ValidPhoneNumber (libphonenumber) rejects unallocated numbers like the
                    // previous "+10000000000" placeholder, which made this INSERT fail bean
                    // validation (ConstraintViolationException) the moment ADMIN_EMAIL/PASSWORD
                    // were actually configured — a real bootstrap-admin-seeding bug, not just a
                    // test artifact.
                    .phone("+919999999999")
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
                "SET category_id = c_new.id, subcategory = 'FRESHENERS' " +
                "FROM category c_old, category c_new " +
                "WHERE p.category_id = c_old.id " +
                "AND c_new.type = 'BAKHOOR' " +
                "AND c_old.type = 'CAR_PERFUMES'"
            );
            jdbcTemplate.execute("DELETE FROM category WHERE type = 'CAR_PERFUMES'");
            log.info("Migrated Car Perfumes to Bakhoor/Fresheners.");
        } catch (Exception e) {
            log.warn("Could not migrate Car Perfumes: {}", e.getMessage());
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
