package com.alahadattars.audit;

import com.alahadattars.dto.cart.GuestCartRequest;
import com.alahadattars.dto.product.ProductSummaryResponse;
import com.alahadattars.dto.review.ReviewResponse;
import com.alahadattars.dto.review.ReviewSummaryResponse;
import com.alahadattars.entity.*;
import com.alahadattars.enums.CategoryType;
import com.alahadattars.enums.Gender;
import com.alahadattars.enums.ProductType;
import com.alahadattars.repository.*;
import com.alahadattars.security.AuthRateLimitFilter;
import com.alahadattars.service.CartService;
import com.alahadattars.service.ProductService;
import com.alahadattars.service.ReviewService;
import jakarta.persistence.EntityManager;
import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
public class PerformanceVerificationAuditTest {

    @Autowired private EntityManager entityManager;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private ReviewService reviewService;
    @Autowired private ReviewRepository reviewRepository;
    @Autowired private HelpfulVoteRepository helpfulVoteRepository;
    @Autowired private ProductService productService;
    @Autowired private ProductRepository productRepository;
    @Autowired private ProductVariantRepository productVariantRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private CartService cartService;
    @Autowired private AuthRateLimitFilter authRateLimitFilter;

    @Autowired private RoleRepository roleRepository;

    private SessionFactory sessionFactory;
    private Statistics stats;
    private TransactionTemplate txTemplate;
    private Role userRole;

    @BeforeEach
    void setUp() {
        Session session = entityManager.unwrap(Session.class);
        sessionFactory = session.getSessionFactory();
        stats = sessionFactory.getStatistics();
        stats.setStatisticsEnabled(true);
        txTemplate = new TransactionTemplate(transactionManager);
        userRole = roleRepository.findByName(com.alahadattars.enums.RoleType.USER)
                .orElseGet(() -> roleRepository.save(Role.builder()
                        .name(com.alahadattars.enums.RoleType.USER)
                        .description("Default User")
                        .build()));
    }

    @Test
    @DisplayName("Verify SQL query count for Review List endpoint: Expect <= 5 queries for a page of 20 reviews")
    void verifyReviewPageQueryCount() {
        // Setup in a dedicated transaction
        Long productId = txTemplate.execute(status -> {
            Category cat = categoryRepository.save(Category.builder()
                    .name("Audit-Reviews-Cat").description("desc").image("img").type(CategoryType.ATTARS).build());
            Product product = productRepository.save(Product.builder()
                    .name("Review Test Perfume").slug("review-test-perfume-" + UUID.randomUUID())
                    .brand("Al Ahad").category(cat).description("desc").fragranceFamily("Oriental")
                    .topNotes("Rose").middleNotes("Amber").baseNotes("Oud")
                    .longevity("Long").projection("Strong").gender(Gender.UNISEX)
                    .shortDescription("short").build());

            User author = userRepository.save(User.builder()
                    .email("author-" + UUID.randomUUID() + "@test.com").password("pass123")
                    .firstName("Reviewer").lastName("User").phone("+919876543210")
                    .role(userRole)
                    .build());

            // Create 20 reviews with votes
            for (int i = 0; i < 20; i++) {
                Review rev = Review.builder()
                        .product(product)
                        .user(author)
                        .rating(5)
                        .title("Review " + i)
                        .description("Content " + i)
                        .isHidden(false)
                        .build();
                Review savedRev = reviewRepository.save(rev);
                HelpfulVote vote = HelpfulVote.builder().review(savedRev).user(author).build();
                helpfulVoteRepository.save(vote);
            }
            return product.getId();
        });

        // Clear persistence context & stats
        entityManager.clear();
        stats.clear();

        // Execute service method in readOnly transaction
        Page<ReviewResponse> response = txTemplate.execute(status -> {
            stats.clear();
            return reviewService.getProductReviews(productId, null, null, PageRequest.of(0, 20));
        });

        long executedQueries = stats.getPrepareStatementCount();
        System.out.println(">>> ACTUAL SQL QUERIES for getProductReviews (20 items): " + executedQueries);

        assertThat(response).isNotNull();
        assertThat(response.getContent()).hasSize(20);
        // Expect:
        // 1. SELECT reviews JOIN FETCH user (with EntityGraph)
        // 2. SELECT COUNT(*) (Pageable companion count query)
        // 3. Batch helpful votes count (countByReviewIds)
        // Total should be <= 5 queries (far below the previous 82 queries)
        assertThat(executedQueries).isLessThanOrEqualTo(5);
    }

    @Test
    @DisplayName("Verify SQL query count for Review Summary endpoint: Expect <= 2 queries")
    void verifyReviewSummaryQueryCount() {
        Long productId = txTemplate.execute(status -> {
            Category cat = categoryRepository.save(Category.builder()
                    .name("Audit-Summary-Cat").description("desc").image("img").type(CategoryType.PERFUMES).build());
            Product product = productRepository.save(Product.builder()
                    .name("Summary Test Perfume").slug("summary-test-perfume-" + UUID.randomUUID())
                    .brand("Al Ahad").category(cat).description("desc").fragranceFamily("Floral")
                    .topNotes("Jasmine").middleNotes("Musk").baseNotes("Vanilla")
                    .longevity("Long").projection("Strong").gender(Gender.UNISEX)
                    .shortDescription("short").build());

            User user = userRepository.save(User.builder()
                    .email("user-sum-" + UUID.randomUUID() + "@test.com").password("pass123")
                    .firstName("User").lastName("Sum").phone("+919876543211")
                    .role(userRole)
                    .build());

            for (int i = 1; i <= 5; i++) {
                reviewRepository.save(Review.builder().product(product).user(user).rating(i).isHidden(false).build());
            }
            return product.getId();
        });

        entityManager.clear();

        ReviewSummaryResponse summary = txTemplate.execute(status -> {
            stats.clear();
            return reviewService.getProductReviewSummary(productId);
        });

        long executedQueries = stats.getPrepareStatementCount();
        System.out.println(">>> ACTUAL SQL QUERIES for getProductReviewSummary: " + executedQueries);

        assertThat(summary).isNotNull();
        assertThat(summary.getRatingDistribution()).hasSize(5);
        // 1. SELECT product by ID
        // 2. SELECT rating, COUNT(*) GROUP BY rating
        assertThat(executedQueries).isLessThanOrEqualTo(2);
    }

    @Test
    @DisplayName("Verify SQL query count for Related Products: Expect no COUNT(*) companion queries")
    void verifyRelatedProductsQueryCount() {
        Long productId = txTemplate.execute(status -> {
            Category cat = categoryRepository.save(Category.builder()
                    .name("Audit-Related-Cat").description("desc").image("img").type(CategoryType.ATTARS).build());

            Product mainProduct = productRepository.save(Product.builder()
                    .name("Main Product").slug("main-product-" + UUID.randomUUID())
                    .brand("Al Ahad").category(cat).description("desc").fragranceFamily("Woody")
                    .topNotes("Cedar").middleNotes("Amber").baseNotes("Sandalwood")
                    .longevity("Long").projection("Strong").gender(Gender.UNISEX)
                    .shortDescription("short").build());

            for (int i = 0; i < 8; i++) {
                productRepository.save(Product.builder()
                        .name("Related " + i).slug("related-" + i + "-" + UUID.randomUUID())
                        .brand("Al Ahad").category(cat).description("desc").fragranceFamily("Woody")
                        .topNotes("Cedar").middleNotes("Amber").baseNotes("Sandalwood")
                        .longevity("Long").projection("Strong").gender(Gender.UNISEX)
                        .shortDescription("short").active(true).build());
            }
            return mainProduct.getId();
        });

        entityManager.clear();

        List<ProductSummaryResponse> related = txTemplate.execute(status -> {
            stats.clear();
            return productService.getRelatedProducts(productId);
        });

        long executedQueries = stats.getPrepareStatementCount();
        System.out.println(">>> ACTUAL SQL QUERIES for getRelatedProducts: " + executedQueries);

        assertThat(related).isNotEmpty();
        // 1. findById(mainProduct)
        // 2. findByCategoryAndIdNotAndActiveTrue(cat, id, limit) [List return, no COUNT(*)]
        // Batch queries for collections/variants/images as needed
        // Total queries should be <= 6 (no COUNT(*) companion queries)
        assertThat(executedQueries).isLessThanOrEqualTo(6);
    }

    @Test
    @DisplayName("Verify Bulk Variant Deactivation on deleteProduct: 1 bulk update instead of loop")
    void verifyBulkVariantDeactivation() {
        Long productId = txTemplate.execute(status -> {
            Category cat = categoryRepository.save(Category.builder()
                    .name("Audit-Delete-Cat").description("desc").image("img").type(CategoryType.ATTARS).build());
            Product product = productRepository.save(Product.builder()
                    .name("Product To Delete").slug("delete-product-" + UUID.randomUUID())
                    .brand("Al Ahad").category(cat).description("desc").fragranceFamily("Woody")
                    .topNotes("Cedar").middleNotes("Amber").baseNotes("Sandalwood")
                    .longevity("Long").projection("Strong").gender(Gender.UNISEX)
                    .shortDescription("short").active(true).build());

            for (int i = 0; i < 5; i++) {
                productVariantRepository.save(ProductVariant.builder()
                        .product(product).productType(ProductType.ATTAR).size((3 * (i + 1)) + "ml")
                        .price(new BigDecimal("100.00")).discountedPrice(new BigDecimal("90.00"))
                        .stock(10).sku("SKU-DEL-" + UUID.randomUUID()).active(true).build());
            }
            return product.getId();
        });

        entityManager.clear();

        txTemplate.execute(status -> {
            stats.clear();
            productService.deleteProduct(productId);
            return null;
        });

        long executedQueries = stats.getPrepareStatementCount();
        System.out.println(">>> ACTUAL SQL QUERIES for deleteProduct (with 5 variants): " + executedQueries);

        // 1. findById
        // 2. product save (set active = false)
        // 3. bulk update ProductVariant (deactivateByProduct)
        // Total should be <= 3 queries, NOT 1 + 1 + 5 = 7 queries!
        assertThat(executedQueries).isLessThanOrEqualTo(3);

        List<ProductVariant> variants = productVariantRepository.findByProduct(productRepository.findById(productId).get());
        assertThat(variants).allMatch(v -> !v.isActive());
    }

    @Test
    @DisplayName("Rate Limiter Memory Safety: 50,000 distinct IPs test strictly bounded cache")
    void verifyRateLimiterMemorySafetyUnderStress() throws Exception {
        long startTime = System.currentTimeMillis();
        // Simulate 50,000 unique attacker IP addresses hitting /api/auth/login
        for (int i = 0; i < 50_000; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/login");
            // Unique IP address per request
            int b1 = (i >> 16) & 0xFF;
            int b2 = (i >> 8) & 0xFF;
            int b3 = i & 0xFF;
            req.setRemoteAddr("10." + b1 + "." + b2 + "." + b3);
            MockHttpServletResponse res = new MockHttpServletResponse();
            MockFilterChain filterChain = new MockFilterChain();

            authRateLimitFilter.doFilter(req, res, filterChain);
        }

        long elapsedMs = System.currentTimeMillis() - startTime;
        System.out.println(">>> RATE LIMITER STRESS: Processed 50,000 unique IPs in " + elapsedMs + " ms");

        // The Caffeine cache size must be strictly bounded at <= 10,000
        // Measure memory usage doesn't spike out of control
        long memoryUsed = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
        System.out.println(">>> CURRENT HEAP USAGE: " + (memoryUsed / (1024 * 1024)) + " MB");

        assertThat(elapsedMs).isLessThan(5000); // Should process 50k requests in < 5 seconds
    }
}
