package com.alahadattars.service.impl;

import com.alahadattars.dto.homepage.HomepageProductSlotRequest;
import com.alahadattars.entity.Category;
import com.alahadattars.entity.Product;
import com.alahadattars.enums.CategoryType;
import com.alahadattars.enums.Gender;
import com.alahadattars.enums.HomepageProductSection;
import com.alahadattars.exception.ConflictException;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.HomepageProductSlotRepository;
import com.alahadattars.repository.ProductRepository;
import com.alahadattars.service.HomepageProductSlotService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class HomepageProductSlotIntegrationTest {

    @Autowired
    private HomepageProductSlotService slotService;

    @Autowired
    private HomepageProductSlotRepository slotRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    private Product testProduct;

    @BeforeEach
    void setUp() {
        Category cat = Category.builder()
                .name("Attars_Integration_Test_" + System.currentTimeMillis())
                .description("Desc")
                .image("default.jpg")
                .type(CategoryType.ATTARS)
                .build();
        cat = categoryRepository.save(cat);

        Product p = Product.builder()
                .name("Test Attar for Integration")
                .slug("test-attar-int")
                .description("Desc")
                .brand("Brand")
                .fragranceFamily("Family")
                .topNotes("Top")
                .middleNotes("Mid")
                .baseNotes("Base")
                .longevity("Long")
                .projection("Proj")
                .gender(Gender.UNISEX)
                .category(cat)
                .build();
        testProduct = productRepository.save(p);
    }

    @AfterEach
    void tearDown() {
        slotRepository.deleteAll();
        productRepository.deleteAll();
        categoryRepository.deleteAll();
    }

    @Test
    void testConcurrentSlotAddition_PreventsDuplicates() throws InterruptedException {
        int numberOfThreads = 5;
        ExecutorService executorService = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch latch = new CountDownLatch(1);
        List<Future<Exception>> futures = new ArrayList<>();

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);

        for (int i = 0; i < numberOfThreads; i++) {
            futures.add(executorService.submit(() -> {
                try {
                    latch.await(); // wait until all threads are ready
                    HomepageProductSlotRequest req = new HomepageProductSlotRequest();
                    req.setProductId(testProduct.getId());
                    slotService.addSlot(HomepageProductSection.ATTARS, req);
                    successCount.incrementAndGet();
                    return null;
                } catch (ConflictException e) {
                    conflictCount.incrementAndGet();
                    return e;
                } catch (Exception e) {
                    return e;
                }
            }));
        }

        latch.countDown(); // release all threads simultaneously
        executorService.shutdown();
        executorService.awaitTermination(10, TimeUnit.SECONDS);

        assertThat(successCount.get()).isEqualTo(1); // Only one should succeed
        assertThat(conflictCount.get()).isEqualTo(numberOfThreads - 1); // The rest should fail with ConflictException
        assertThat(slotRepository.count()).isEqualTo(1); // Only one slot in DB
    }
}
