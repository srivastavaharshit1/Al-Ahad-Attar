package com.alahadattars.service.impl;

import com.alahadattars.dto.homepage.HomepageProductSectionResponse;
import com.alahadattars.dto.homepage.HomepageProductSlotRequest;
import com.alahadattars.dto.homepage.HomepageProductSlotResponse;
import com.alahadattars.entity.Category;
import com.alahadattars.entity.HomepageProductSlot;
import com.alahadattars.entity.Product;
import com.alahadattars.enums.CategoryType;
import com.alahadattars.enums.Gender;
import com.alahadattars.enums.HomepageProductSection;
import com.alahadattars.exception.ConflictException;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.mapper.ProductMapper;
import com.alahadattars.repository.HomepageProductSlotRepository;
import com.alahadattars.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HomepageProductSlotServiceImplTest {

    @Mock HomepageProductSlotRepository slotRepository;
    @Mock ProductRepository productRepository;
    @Mock ProductMapper productMapper;

    @InjectMocks HomepageProductSlotServiceImpl service;

    private Product attarProduct;
    private Product perfumeProduct;
    private Product carPerfumeProduct;
    private Product bakhoorProduct;

    @BeforeEach
    void setUp() {
        Category attarsCategory = Category.builder()
                .name("Attars").description("Attars").image("img").type(CategoryType.ATTARS).build();

        Category perfumesCategory = Category.builder()
                .name("Perfumes").description("Perfumes").image("img").type(CategoryType.PERFUMES).build();

        Category bakhoorCategory = Category.builder()
                .name("Bakhoor").description("Bakhoor").image("img").type(CategoryType.BAKHOOR).build();

        attarProduct = Product.builder()
                .name("Test Attar").slug("test-attar").description("desc").brand("B")
                .fragranceFamily("").topNotes("").middleNotes("").baseNotes("")
                .longevity("").projection("").gender(Gender.UNISEX)
                .category(attarsCategory).build();
        setId(attarProduct, 1L);

        perfumeProduct = Product.builder()
                .name("Test Perfume").slug("test-perfume").description("desc").brand("B")
                .fragranceFamily("").topNotes("").middleNotes("").baseNotes("")
                .longevity("").projection("").gender(Gender.UNISEX)
                .category(perfumesCategory).build();
        setId(perfumeProduct, 2L);

        carPerfumeProduct = Product.builder()
                .name("Car Perfume X").slug("car-perfume-x").description("desc").brand("B")
                .fragranceFamily("").topNotes("").middleNotes("").baseNotes("")
                .longevity("").projection("").gender(Gender.UNISEX)
                .subcategory("Car Perfumes")
                .category(perfumesCategory).build();
        setId(carPerfumeProduct, 3L);

        bakhoorProduct = Product.builder()
                .name("Bakhoor X").slug("bakhoor-x").description("desc").brand("B")
                .fragranceFamily("").topNotes("").middleNotes("").baseNotes("")
                .longevity("").projection("").gender(Gender.UNISEX)
                .category(bakhoorCategory).build();
        setId(bakhoorProduct, 4L);
    }

    // ── Eligibility Validation ────────────────────────────────────────────────

    @Test
    void addSlot_attarProductInAttarSection_succeeds() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(attarProduct));
        when(slotRepository.existsBySectionAndProductId(any(), any())).thenReturn(false);
        when(slotRepository.findBySectionOrderByDisplayOrderAsc(any())).thenReturn(List.of());
        when(slotRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(productMapper.toSummaryResponse(any())).thenReturn(null);

        HomepageProductSlotRequest req = new HomepageProductSlotRequest();
        req.setProductId(1L);

        HomepageProductSlotResponse result = service.addSlot(HomepageProductSection.ATTARS, req);
        assertThat(result).isNotNull();
    }

    @Test
    void addSlot_perfumeProductWithAttarVariantInAttarSection_succeeds() {
        com.alahadattars.entity.ProductVariant v = new com.alahadattars.entity.ProductVariant();
        v.setProductType(com.alahadattars.enums.ProductType.ATTAR);
        perfumeProduct.setVariants(List.of(v));
        
        when(productRepository.findById(2L)).thenReturn(Optional.of(perfumeProduct));
        when(slotRepository.existsBySectionAndProductId(any(), any())).thenReturn(false);
        when(slotRepository.findBySectionOrderByDisplayOrderAsc(any())).thenReturn(List.of());
        when(slotRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(productMapper.toSummaryResponse(any())).thenReturn(null);

        HomepageProductSlotRequest req = new HomepageProductSlotRequest();
        req.setProductId(2L);
        assertThat(service.addSlot(HomepageProductSection.ATTARS, req)).isNotNull();
    }

    @Test
    void addSlot_perfumeProductInAttarSection_throwsBadRequest() {
        when(productRepository.findById(2L)).thenReturn(Optional.of(perfumeProduct));

        HomepageProductSlotRequest req = new HomepageProductSlotRequest();
        req.setProductId(2L);

        assertThatThrownBy(() -> service.addSlot(HomepageProductSection.ATTARS, req))
                .isInstanceOf(com.alahadattars.exception.BadRequestException.class)
                .hasMessageContaining("Attar");
    }

    @Test
    void addSlot_attarProductWithPerfumeVariantInPerfumesBakhoorSection_succeeds() {
        com.alahadattars.entity.ProductVariant v = new com.alahadattars.entity.ProductVariant();
        v.setProductType(com.alahadattars.enums.ProductType.PERFUME);
        attarProduct.setVariants(List.of(v));

        when(productRepository.findById(1L)).thenReturn(Optional.of(attarProduct));
        when(slotRepository.existsBySectionAndProductId(any(), any())).thenReturn(false);
        when(slotRepository.findBySectionOrderByDisplayOrderAsc(any())).thenReturn(List.of());
        when(slotRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(productMapper.toSummaryResponse(any())).thenReturn(null);

        HomepageProductSlotRequest req = new HomepageProductSlotRequest();
        req.setProductId(1L);
        assertThat(service.addSlot(HomepageProductSection.PERFUMES_BAKHOOR, req)).isNotNull();
    }

    @Test
    void addSlot_perfumeProductInPerfumesBakhoorSection_succeeds() {
        when(productRepository.findById(2L)).thenReturn(Optional.of(perfumeProduct));
        when(slotRepository.existsBySectionAndProductId(any(), any())).thenReturn(false);
        when(slotRepository.findBySectionOrderByDisplayOrderAsc(any())).thenReturn(List.of());
        when(slotRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(productMapper.toSummaryResponse(any())).thenReturn(null);

        HomepageProductSlotRequest req = new HomepageProductSlotRequest();
        req.setProductId(2L);
        assertThat(service.addSlot(HomepageProductSection.PERFUMES_BAKHOOR, req)).isNotNull();
    }

    @Test
    void addSlot_nullVariantsList_handledSafely() {
        // Set variants to null instead of empty list
        perfumeProduct.setVariants(null);
        when(productRepository.findById(2L)).thenReturn(Optional.of(perfumeProduct));

        HomepageProductSlotRequest req = new HomepageProductSlotRequest();
        req.setProductId(2L);

        // Should throw BadRequest cleanly, not NullPointerException
        assertThatThrownBy(() -> service.addSlot(HomepageProductSection.ATTARS, req))
                .isInstanceOf(com.alahadattars.exception.BadRequestException.class)
                .hasMessageContaining("Attar");
    }

    @Test
    void addSlot_carPerfumeProductInPerfumesBakhoorSection_throwsBadRequest() {
        when(productRepository.findById(3L)).thenReturn(Optional.of(carPerfumeProduct));

        HomepageProductSlotRequest req = new HomepageProductSlotRequest();
        req.setProductId(3L);

        assertThatThrownBy(() -> service.addSlot(HomepageProductSection.PERFUMES_BAKHOOR, req))
                .isInstanceOf(com.alahadattars.exception.BadRequestException.class)
                .hasMessageContaining("Car Perfume");
    }

    @Test
    void addSlot_carPerfumeProductInCarPerfumeSection_succeeds() {
        when(productRepository.findById(3L)).thenReturn(Optional.of(carPerfumeProduct));
        when(slotRepository.existsBySectionAndProductId(any(), any())).thenReturn(false);
        when(slotRepository.findBySectionOrderByDisplayOrderAsc(any())).thenReturn(List.of());
        when(slotRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(productMapper.toSummaryResponse(any())).thenReturn(null);

        HomepageProductSlotRequest req = new HomepageProductSlotRequest();
        req.setProductId(3L);

        HomepageProductSlotResponse result = service.addSlot(HomepageProductSection.CAR_PERFUMES_INCENSE, req);
        assertThat(result).isNotNull();
    }

    @Test
    void addSlot_bakhoorProductInCarPerfumeSection_succeeds() {
        when(productRepository.findById(4L)).thenReturn(Optional.of(bakhoorProduct));
        when(slotRepository.existsBySectionAndProductId(any(), any())).thenReturn(false);
        when(slotRepository.findBySectionOrderByDisplayOrderAsc(any())).thenReturn(List.of());
        when(slotRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(productMapper.toSummaryResponse(any())).thenReturn(null);

        HomepageProductSlotRequest req = new HomepageProductSlotRequest();
        req.setProductId(4L);

        HomepageProductSlotResponse result = service.addSlot(HomepageProductSection.CAR_PERFUMES_INCENSE, req);
        assertThat(result).isNotNull();
    }

    @Test
    void addSlot_duplicateProduct_throwsConflict() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(attarProduct));
        when(slotRepository.existsBySectionAndProductId(HomepageProductSection.ATTARS, 1L)).thenReturn(true);

        HomepageProductSlotRequest req = new HomepageProductSlotRequest();
        req.setProductId(1L);

        assertThatThrownBy(() -> service.addSlot(HomepageProductSection.ATTARS, req))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void addSlot_productNotFound_throwsResourceNotFound() {
        when(productRepository.findById(99L)).thenReturn(Optional.empty());

        HomepageProductSlotRequest req = new HomepageProductSlotRequest();
        req.setProductId(99L);

        assertThatThrownBy(() -> service.addSlot(HomepageProductSection.ATTARS, req))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void removeSlot_notFound_throwsResourceNotFound() {
        when(slotRepository.existsById(999L)).thenReturn(false);
        assertThatThrownBy(() -> service.removeSlot(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void removeSlot_exists_deletes() {
        when(slotRepository.existsById(1L)).thenReturn(true);
        service.removeSlot(1L);
        verify(slotRepository).deleteById(1L);
    }

    @Test
    void setEnabled_updatesSlot() {
        HomepageProductSlot slot = HomepageProductSlot.builder()
                .section(HomepageProductSection.ATTARS)
                .product(attarProduct)
                .displayOrder(1)
                .enabled(true)
                .build();
        when(slotRepository.findById(1L)).thenReturn(Optional.of(slot));
        when(slotRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(productMapper.toSummaryResponse(any())).thenReturn(null);

        service.setEnabled(1L, false);

        assertThat(slot.isEnabled()).isFalse();
        verify(slotRepository).save(slot);
    }

    @Test
    void getAllSectionsForCustomer_returnsThreeSections() {
        when(slotRepository.findEnabledBySectionOrderByDisplayOrderAsc(any())).thenReturn(List.of());

        List<HomepageProductSectionResponse> result = service.getAllSectionsForCustomer();

        assertThat(result).hasSize(3);
        assertThat(result).extracting(r -> r.getSection().name())
                .containsExactlyInAnyOrder("ATTARS", "PERFUMES_BAKHOOR", "CAR_PERFUMES_INCENSE");
    }

    // Utility: set ID on entity using the Lombok-generated setter from BaseEntity
    private void setId(Object entity, Long id) {
        try {
            entity.getClass().getMethod("setId", Long.class).invoke(entity, id);
        } catch (Exception e) {
            // BaseEntity.setId is package-level via Lombok — fall back to field access
            try {
                var field = com.alahadattars.entity.BaseEntity.class.getDeclaredField("id");
                field.setAccessible(true);
                field.set(entity, id);
            } catch (Exception ex) {
                throw new RuntimeException(ex);
            }
        }
    }
}
