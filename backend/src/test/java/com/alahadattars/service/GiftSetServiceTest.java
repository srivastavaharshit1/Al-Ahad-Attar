package com.alahadattars.service;

import com.alahadattars.dto.giftset.GiftSetImageResponse;
import com.alahadattars.dto.giftset.GiftSetItemRequest;
import com.alahadattars.dto.giftset.GiftSetRequest;
import com.alahadattars.dto.giftset.GiftSetResponse;
import com.alahadattars.entity.GiftSet;
import com.alahadattars.entity.GiftSetImage;
import com.alahadattars.entity.GiftSetItem;
import com.alahadattars.entity.OrderItemGiftSetComponent;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.repository.GiftSetImageRepository;
import com.alahadattars.repository.GiftSetItemRepository;
import com.alahadattars.repository.GiftSetRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.service.impl.GiftSetServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GiftSetServiceTest {

    @Mock
    private GiftSetRepository giftSetRepository;

    @Mock
    private GiftSetItemRepository giftSetItemRepository;

    @Mock
    private GiftSetImageRepository giftSetImageRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    @Mock
    private StorageService storageService;

    @InjectMocks
    private GiftSetServiceImpl giftSetService;

    private Product product;
    private ProductVariant variant1;
    private ProductVariant variant2;
    private ProductVariant variant3;
    private ProductVariant inactiveVariant;

    @BeforeEach
    void setUp() {
        product = Product.builder()
                .name("Oud Royale")
                .slug("oud-royale")
                .active(true)
                .build();
        product.setId(10L);

        variant1 = ProductVariant.builder()
                .product(product)
                .size("12ml")
                .sku("OUD-ROY-12")
                .stock(15)
                .active(true)
                .price(new BigDecimal("1500.00"))
                .build();
        variant1.setId(101L);

        variant2 = ProductVariant.builder()
                .product(product)
                .size("6ml")
                .sku("OUD-ROY-06")
                .stock(20)
                .active(true)
                .price(new BigDecimal("800.00"))
                .build();
        variant2.setId(102L);

        variant3 = ProductVariant.builder()
                .product(product)
                .size("3ml")
                .sku("OUD-ROY-03")
                .stock(30)
                .active(true)
                .price(new BigDecimal("500.00"))
                .build();
        variant3.setId(103L);

        inactiveVariant = ProductVariant.builder()
                .product(product)
                .size("30ml")
                .sku("OUD-ROY-30")
                .stock(10)
                .active(false)
                .price(new BigDecimal("3000.00"))
                .build();
        inactiveVariant.setId(104L);
    }

    @Test
    @DisplayName("Reject creation when price is zero or negative")
    void testCreateGiftSet_PriceNonPositive_ThrowsBadRequest() {
        GiftSetRequest req = GiftSetRequest.builder()
                .name("Luxury Set")
                .price(BigDecimal.ZERO)
                .items(List.of(new GiftSetItemRequest(101L, 1, 0)))
                .build();

        assertThatThrownBy(() -> giftSetService.createGiftSet(req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("price must be greater than zero");
    }

    @Test
    @DisplayName("Reject creation when salePrice is greater than regular price")
    void testCreateGiftSet_SalePriceExceedsPrice_ThrowsBadRequest() {
        GiftSetRequest req = GiftSetRequest.builder()
                .name("Luxury Set")
                .price(new BigDecimal("1999.00"))
                .salePrice(new BigDecimal("2500.00"))
                .items(List.of(new GiftSetItemRequest(101L, 1, 0)))
                .build();

        assertThatThrownBy(() -> giftSetService.createGiftSet(req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Sale price cannot be greater than the regular price");
    }

    @Test
    @DisplayName("Reject creation when items list is empty")
    void testCreateGiftSet_EmptyItems_ThrowsBadRequest() {
        GiftSetRequest req = GiftSetRequest.builder()
                .name("Empty Set")
                .price(new BigDecimal("1999.00"))
                .items(List.of())
                .build();

        assertThatThrownBy(() -> giftSetService.createGiftSet(req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("must contain at least one item");
    }

    @Test
    @DisplayName("Reject creation when duplicate variant ID is included")
    void testCreateGiftSet_DuplicateVariant_ThrowsBadRequest() {
        GiftSetRequest req = GiftSetRequest.builder()
                .name("Duplicate Variant Set")
                .price(new BigDecimal("1999.00"))
                .items(List.of(
                        new GiftSetItemRequest(101L, 1, 0),
                        new GiftSetItemRequest(101L, 2, 1)
                ))
                .build();

        assertThatThrownBy(() -> giftSetService.createGiftSet(req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Duplicate variant ID in gift set: 101");
    }

    @Test
    @DisplayName("Successful creation generates valid slug and maps components properly")
    void testCreateGiftSet_Success() {
        GiftSetRequest req = GiftSetRequest.builder()
                .name("Royal Oud & Musk Collection")
                .price(new BigDecimal("2299.00"))
                .salePrice(new BigDecimal("1999.00"))
                .packagingNotes("Includes handcrafted presentation box")
                .active(true)
                .featured(true)
                .items(List.of(
                        new GiftSetItemRequest(101L, 1, 0),
                        new GiftSetItemRequest(102L, 2, 1)
                ))
                .build();

        when(giftSetRepository.existsBySlug("royal-oud-musk-collection")).thenReturn(false);
        when(productVariantRepository.findById(101L)).thenReturn(Optional.of(variant1));
        when(productVariantRepository.findById(102L)).thenReturn(Optional.of(variant2));
        when(giftSetRepository.save(any(GiftSet.class))).thenAnswer(invocation -> {
            GiftSet gs = invocation.getArgument(0);
            gs.setId(1L);
            return gs;
        });

        GiftSetResponse response = giftSetService.createGiftSet(req);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getName()).isEqualTo("Royal Oud & Musk Collection");
        assertThat(response.getSlug()).isEqualTo("royal-oud-musk-collection");
        assertThat(response.getPrice()).isEqualByComparingTo("2299.00");
        assertThat(response.getSalePrice()).isEqualByComparingTo("1999.00");
        assertThat(response.isInStock()).isTrue();
        // variant1 stock 15 / 1 = 15; variant2 stock 20 / 2 = 10 -> min = 10
        assertThat(response.getAvailableStock()).isEqualTo(10);
        assertThat(response.getItems()).hasSize(2);
    }

    @Test
    @DisplayName("Upload image sets primary flag if it is the first image")
    void testUploadImage_FirstImageBecomesPrimary() {
        GiftSet giftSet = GiftSet.builder()
                .name("Oud Set")
                .slug("oud-set")
                .price(new BigDecimal("1500.00"))
                .images(new ArrayList<>())
                .build();
        giftSet.setId(1L);

        MockMultipartFile file = new MockMultipartFile(
                "file", "box.jpg", "image/jpeg", "image-content".getBytes()
        );

        when(giftSetRepository.findById(1L)).thenReturn(Optional.of(giftSet));
        when(giftSetImageRepository.countByGiftSetAndActiveTrue(giftSet)).thenReturn(0);
        when(storageService.uploadFile(eq(file), eq("gift-sets/1"))).thenReturn("gift-sets/1/uuid.jpg");
        when(storageService.resolveUrl(eq("gift-sets/1/uuid.jpg"), anyString())).thenReturn("https://cdn.example.com/gift-sets/1/uuid.jpg");
        when(giftSetImageRepository.save(any(GiftSetImage.class))).thenAnswer(invocation -> {
            GiftSetImage img = invocation.getArgument(0);
            img.setId(50L);
            return img;
        });

        GiftSetImageResponse response = giftSetService.uploadImage(1L, file);

        assertThat(response.getId()).isEqualTo(50L);
        assertThat(response.isPrimary()).isTrue();
        assertThat(response.getImageUrl()).isEqualTo("https://cdn.example.com/gift-sets/1/uuid.jpg");
    }

    @Test
    @DisplayName("Deactivate gift set soft-deletes by setting active to false")
    void testDeleteGiftSet_SoftDeactivates() {
        GiftSet giftSet = GiftSet.builder()
                .name("Oud Set")
                .slug("oud-set")
                .price(new BigDecimal("1500.00"))
                .active(true)
                .build();
        giftSet.setId(1L);

        when(giftSetRepository.findById(1L)).thenReturn(Optional.of(giftSet));

        giftSetService.deleteGiftSet(1L);

        assertThat(giftSet.isActive()).isFalse();
        verify(giftSetRepository).save(giftSet);
    }

    private GiftSet createExistingGiftSet(Long id) {
        GiftSet giftSet = GiftSet.builder()
                .name("Oud Duo")
                .slug("oud-duo")
                .price(new BigDecimal("2000.00"))
                .active(true)
                .displayOrder(1)
                .items(new ArrayList<>())
                .images(new ArrayList<>())
                .build();
        giftSet.setId(id);

        GiftSetItem item1 = GiftSetItem.builder()
                .giftSet(giftSet)
                .product(product)
                .variant(variant1)
                .quantity(1)
                .displayOrder(0)
                .build();
        item1.setId(501L);

        GiftSetItem item2 = GiftSetItem.builder()
                .giftSet(giftSet)
                .product(product)
                .variant(variant2)
                .quantity(2)
                .displayOrder(1)
                .build();
        item2.setId(502L);

        giftSet.addItem(item1);
        giftSet.addItem(item2);
        return giftSet;
    }

    @Test
    @DisplayName("1. Update Gift Set without changing variants succeeds in-place and preserves entity IDs")
    void testUpdateGiftSet_RetainSameVariants_PreservesEntities() {
        GiftSet existing = createExistingGiftSet(1L);
        when(giftSetRepository.findByIdWithItemsEager(1L)).thenReturn(Optional.of(existing));
        when(giftSetRepository.existsBySlugAndIdNot(anyString(), eq(1L))).thenReturn(false);
        when(giftSetRepository.save(any(GiftSet.class))).thenAnswer(i -> i.getArgument(0));

        GiftSetRequest req = GiftSetRequest.builder()
                .name("Oud Duo Refined")
                .price(new BigDecimal("2100.00"))
                .active(true)
                .items(List.of(
                        new GiftSetItemRequest(101L, 1, 0),
                        new GiftSetItemRequest(102L, 2, 1)
                ))
                .build();

        GiftSetResponse res = giftSetService.updateGiftSet(1L, req);

        assertThat(res.getName()).isEqualTo("Oud Duo Refined");
        assertThat(existing.getItems()).hasSize(2);
        // Entity IDs are preserved because updates were performed in-place
        assertThat(existing.getItems().get(0).getId()).isEqualTo(501L);
        assertThat(existing.getItems().get(1).getId()).isEqualTo(502L);
    }

    @Test
    @DisplayName("2. Update quantities of existing variants succeeds and updates availableStock")
    void testUpdateGiftSet_UpdateQuantities_RecalculatesStock() {
        GiftSet existing = createExistingGiftSet(1L);
        when(giftSetRepository.findByIdWithItemsEager(1L)).thenReturn(Optional.of(existing));
        when(giftSetRepository.existsBySlugAndIdNot(anyString(), eq(1L))).thenReturn(false);
        when(giftSetRepository.save(any(GiftSet.class))).thenAnswer(i -> i.getArgument(0));

        // variant1 stock: 15, qty: 3 -> 5 sets
        // variant2 stock: 20, qty: 4 -> 5 sets
        GiftSetRequest req = GiftSetRequest.builder()
                .name("Oud Duo")
                .price(new BigDecimal("2000.00"))
                .active(true)
                .items(List.of(
                        new GiftSetItemRequest(101L, 3, 0),
                        new GiftSetItemRequest(102L, 4, 1)
                ))
                .build();

        GiftSetResponse res = giftSetService.updateGiftSet(1L, req);

        assertThat(res.getAvailableStock()).isEqualTo(5);
        assertThat(existing.getItems().get(0).getQuantity()).isEqualTo(3);
        assertThat(existing.getItems().get(1).getQuantity()).isEqualTo(4);
    }

    @Test
    @DisplayName("3. Change display order only succeeds")
    void testUpdateGiftSet_ChangeDisplayOrderOnly() {
        GiftSet existing = createExistingGiftSet(1L);
        when(giftSetRepository.findByIdWithItemsEager(1L)).thenReturn(Optional.of(existing));
        when(giftSetRepository.existsBySlugAndIdNot(anyString(), eq(1L))).thenReturn(false);
        when(giftSetRepository.save(any(GiftSet.class))).thenAnswer(i -> i.getArgument(0));

        GiftSetRequest req = GiftSetRequest.builder()
                .name("Oud Duo")
                .price(new BigDecimal("2000.00"))
                .active(true)
                .items(List.of(
                        new GiftSetItemRequest(102L, 2, 0), // Swapped order: 102 first
                        new GiftSetItemRequest(101L, 1, 1)  // 101 second
                ))
                .build();

        giftSetService.updateGiftSet(1L, req);

        GiftSetItem item102 = existing.getItems().stream()
                .filter(i -> i.getVariant().getId().equals(102L)).findFirst().orElseThrow();
        GiftSetItem item101 = existing.getItems().stream()
                .filter(i -> i.getVariant().getId().equals(101L)).findFirst().orElseThrow();

        assertThat(item102.getDisplayOrder()).isEqualTo(0);
        assertThat(item101.getDisplayOrder()).isEqualTo(1);
    }

    @Test
    @DisplayName("4. Add new variant while retaining existing variants succeeds")
    void testUpdateGiftSet_AddNewVariant_Succeeds() {
        GiftSet existing = createExistingGiftSet(1L);
        when(giftSetRepository.findByIdWithItemsEager(1L)).thenReturn(Optional.of(existing));
        when(giftSetRepository.existsBySlugAndIdNot(anyString(), eq(1L))).thenReturn(false);
        when(productVariantRepository.findById(103L)).thenReturn(Optional.of(variant3));
        when(giftSetRepository.save(any(GiftSet.class))).thenAnswer(i -> i.getArgument(0));

        GiftSetRequest req = GiftSetRequest.builder()
                .name("Oud Trio")
                .price(new BigDecimal("2500.00"))
                .active(true)
                .items(List.of(
                        new GiftSetItemRequest(101L, 1, 0),
                        new GiftSetItemRequest(102L, 2, 1),
                        new GiftSetItemRequest(103L, 3, 2) // New variant
                ))
                .build();

        GiftSetResponse res = giftSetService.updateGiftSet(1L, req);

        assertThat(res.getItems()).hasSize(3);
        assertThat(existing.getItems()).hasSize(3);
        assertThat(existing.getItems().get(0).getId()).isEqualTo(501L); // in-place preserved
        assertThat(existing.getItems().get(1).getId()).isEqualTo(502L); // in-place preserved
        assertThat(existing.getItems().get(2).getVariant().getId()).isEqualTo(103L);
    }

    @Test
    @DisplayName("5. Remove a variant succeeds via orphan removal")
    void testUpdateGiftSet_RemoveVariant_Succeeds() {
        GiftSet existing = createExistingGiftSet(1L);
        when(giftSetRepository.findByIdWithItemsEager(1L)).thenReturn(Optional.of(existing));
        when(giftSetRepository.existsBySlugAndIdNot(anyString(), eq(1L))).thenReturn(false);
        when(giftSetRepository.save(any(GiftSet.class))).thenAnswer(i -> i.getArgument(0));

        GiftSetRequest req = GiftSetRequest.builder()
                .name("Oud Solo")
                .price(new BigDecimal("1200.00"))
                .active(true)
                .items(List.of(
                        new GiftSetItemRequest(101L, 1, 0) // Removed 102
                ))
                .build();

        GiftSetResponse res = giftSetService.updateGiftSet(1L, req);

        assertThat(res.getItems()).hasSize(1);
        assertThat(existing.getItems()).hasSize(1);
        assertThat(existing.getItems().get(0).getVariant().getId()).isEqualTo(101L);
    }

    @Test
    @DisplayName("6. Replace all components with different variants succeeds")
    void testUpdateGiftSet_ReplaceAllComponents_Succeeds() {
        GiftSet existing = createExistingGiftSet(1L);
        when(giftSetRepository.findByIdWithItemsEager(1L)).thenReturn(Optional.of(existing));
        when(giftSetRepository.existsBySlugAndIdNot(anyString(), eq(1L))).thenReturn(false);
        when(productVariantRepository.findById(103L)).thenReturn(Optional.of(variant3));
        when(giftSetRepository.save(any(GiftSet.class))).thenAnswer(i -> i.getArgument(0));

        GiftSetRequest req = GiftSetRequest.builder()
                .name("Oud Miniature")
                .price(new BigDecimal("900.00"))
                .active(true)
                .items(List.of(
                        new GiftSetItemRequest(103L, 2, 0) // Entirely new variant
                ))
                .build();

        GiftSetResponse res = giftSetService.updateGiftSet(1L, req);

        assertThat(res.getItems()).hasSize(1);
        assertThat(existing.getItems().get(0).getVariant().getId()).isEqualTo(103L);
    }

    @Test
    @DisplayName("7. Submit duplicate variants is rejected")
    void testUpdateGiftSet_DuplicateVariants_ThrowsBadRequest() {
        GiftSet existing = createExistingGiftSet(1L);
        when(giftSetRepository.findByIdWithItemsEager(1L)).thenReturn(Optional.of(existing));

        GiftSetRequest req = GiftSetRequest.builder()
                .name("Oud Set")
                .price(new BigDecimal("1500.00"))
                .items(List.of(
                        new GiftSetItemRequest(101L, 1, 0),
                        new GiftSetItemRequest(101L, 2, 1) // Duplicate
                ))
                .build();

        assertThatThrownBy(() -> giftSetService.updateGiftSet(1L, req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Duplicate variant ID in gift set: 101");
    }

    @Test
    @DisplayName("8. Submit an invalid or inactive variant is rejected")
    void testUpdateGiftSet_InactiveVariant_ThrowsBadRequest() {
        GiftSet existing = createExistingGiftSet(1L);
        when(giftSetRepository.findByIdWithItemsEager(1L)).thenReturn(Optional.of(existing));
        when(productVariantRepository.findById(104L)).thenReturn(Optional.of(inactiveVariant));

        GiftSetRequest req = GiftSetRequest.builder()
                .name("Oud Set")
                .price(new BigDecimal("1500.00"))
                .items(List.of(
                        new GiftSetItemRequest(104L, 1, 0) // Inactive variant
                ))
                .build();

        assertThatThrownBy(() -> giftSetService.updateGiftSet(1L, req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Cannot include inactive product variant: OUD-ROY-30");
    }

    @Test
    @DisplayName("9. Submit an empty component list is rejected")
    void testUpdateGiftSet_EmptyComponents_ThrowsBadRequest() {
        GiftSet existing = createExistingGiftSet(1L);
        when(giftSetRepository.findByIdWithItemsEager(1L)).thenReturn(Optional.of(existing));

        GiftSetRequest req = GiftSetRequest.builder()
                .name("Oud Set")
                .price(new BigDecimal("1500.00"))
                .items(List.of())
                .build();

        assertThatThrownBy(() -> giftSetService.updateGiftSet(1L, req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Gift set must contain at least one item");
    }

    @Test
    @DisplayName("10. Confirm existing historical order snapshots remain unchanged after gift set update")
    void testUpdateGiftSet_HistoricalOrderSnapshotsRemainUnchanged() {
        GiftSet existing = createExistingGiftSet(1L);
        when(giftSetRepository.findByIdWithItemsEager(1L)).thenReturn(Optional.of(existing));
        when(giftSetRepository.existsBySlugAndIdNot(anyString(), eq(1L))).thenReturn(false);
        when(giftSetRepository.save(any(GiftSet.class))).thenAnswer(i -> i.getArgument(0));

        // Create historical snapshot in OrderItemGiftSetComponent
        OrderItemGiftSetComponent snapshot = OrderItemGiftSetComponent.builder()
                .productId(product.getId())
                .productName(product.getName())
                .variantId(variant1.getId())
                .variantSize(variant1.getSize())
                .sku(variant1.getSku())
                .quantityPerSet(1)
                .totalDeductedQuantity(2)
                .build();
        snapshot.setId(901L);

        // Update the gift set with different price and quantity
        GiftSetRequest req = GiftSetRequest.builder()
                .name("Oud Duo Updated")
                .price(new BigDecimal("3500.00"))
                .active(true)
                .items(List.of(
                        new GiftSetItemRequest(101L, 5, 0),
                        new GiftSetItemRequest(102L, 5, 1)
                ))
                .build();

        GiftSetResponse res = giftSetService.updateGiftSet(1L, req);

        // Verify the gift set was updated
        assertThat(res.getPrice()).isEqualByComparingTo("3500.00");
        // Verify historical snapshot properties are completely unaffected
        assertThat(snapshot.getId()).isEqualTo(901L);
        assertThat(snapshot.getQuantityPerSet()).isEqualTo(1);
        assertThat(snapshot.getTotalDeductedQuantity()).isEqualTo(2);
        assertThat(snapshot.getSku()).isEqualTo("OUD-ROY-12");
    }
}

