package com.alahadattars.service.impl;

import com.alahadattars.dto.homepage.HomepageProductSectionResponse;
import com.alahadattars.dto.homepage.HomepageProductSlotRequest;
import com.alahadattars.dto.homepage.HomepageProductSlotResponse;
import com.alahadattars.entity.HomepageProductSlot;
import com.alahadattars.entity.Product;
import com.alahadattars.enums.CategoryType;
import com.alahadattars.enums.HomepageProductSection;
import com.alahadattars.exception.ConflictException;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.exception.BadRequestException;
import com.alahadattars.mapper.ProductMapper;
import com.alahadattars.repository.HomepageProductSlotRepository;
import com.alahadattars.repository.ProductRepository;
import com.alahadattars.service.HomepageProductSlotService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class HomepageProductSlotServiceImpl implements HomepageProductSlotService {

    private final HomepageProductSlotRepository slotRepository;
    private final ProductRepository productRepository;
    private final ProductMapper productMapper;

    // ── Admin ─────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public List<HomepageProductSlotResponse> getSlotsForSection(HomepageProductSection section) {
        return slotRepository.findBySectionOrderByDisplayOrderAsc(section)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public HomepageProductSlotResponse addSlot(HomepageProductSection section, HomepageProductSlotRequest req) {
        Product product = productRepository.findById(req.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + req.getProductId()));

        validateEligibility(section, product);

        if (slotRepository.existsBySectionAndProductId(section, product.getId())) {
            throw new ConflictException("Product is already in this section");
        }

        // displayOrder: if not supplied, append after the last slot
        int order = req.getDisplayOrder();
        if (order <= 0) {
            List<HomepageProductSlot> existing = slotRepository.findBySectionOrderByDisplayOrderAsc(section);
            order = existing.isEmpty() ? 1 : existing.get(existing.size() - 1).getDisplayOrder() + 1;
        }

        HomepageProductSlot slot = HomepageProductSlot.builder()
                .section(section)
                .product(product)
                .displayOrder(order)
                .enabled(req.isEnabled())
                .build();

        try {
            return toResponse(slotRepository.saveAndFlush(slot));
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new ConflictException("Product is already in this section (concurrent modification)");
        }
    }

    @Override
    @Transactional
    public void removeSlot(Long slotId) {
        if (!slotRepository.existsById(slotId)) {
            throw new ResourceNotFoundException("Slot not found: " + slotId);
        }
        slotRepository.deleteById(slotId);
    }

    @Override
    @Transactional
    public HomepageProductSlotResponse setEnabled(Long slotId, boolean enabled) {
        HomepageProductSlot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new ResourceNotFoundException("Slot not found: " + slotId));
        slot.setEnabled(enabled);
        return toResponse(slotRepository.save(slot));
    }

    @Override
    @Transactional
    public void reorder(HomepageProductSection section, List<ReorderSlotEntry> order) {
        for (ReorderSlotEntry entry : order) {
            slotRepository.findById(entry.slotId()).ifPresent(slot -> {
                if (slot.getSection() == section) {
                    slot.setDisplayOrder(entry.displayOrder());
                    slotRepository.save(slot);
                }
            });
        }
    }

    // ── Customer-facing ───────────────────────────────────────────────────────

    /**
     * Returns all three sections.  Sections with no configured products are omitted entirely
     * (empty list) — the frontend hides sections with an empty product list rather than showing
     * a broken carousel.
     */
    @Override
    @Transactional
    public List<HomepageProductSectionResponse> getAllSectionsForCustomer() {
        return Arrays.stream(HomepageProductSection.values())
                .map(section -> {
                    List<com.alahadattars.dto.product.ProductSummaryResponse> products =
                            slotRepository.findEnabledBySectionOrderByDisplayOrderAsc(section)
                                    .stream()
                                    .map(slot -> productMapper.toSummaryResponse(slot.getProduct()))
                                    .collect(Collectors.toList());
                    return HomepageProductSectionResponse.builder()
                            .section(section)
                            .products(products)
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteSlotsByProductId(Long productId) {
        slotRepository.deleteByProductId(productId);
    }

    // ── Eligibility Validation ────────────────────────────────────────────────

    /**
     * Validates that a product is eligible for the requested section.
     *
     * ATTARS               → product must belong to a category of type ATTARS
     * PERFUMES_BAKHOOR     → PERFUMES or BAKHOOR category, but NOT "Car Perfumes" subcategory
     * CAR_PERFUMES_INCENSE → subcategory == "Car Perfumes" OR category is BAKHOOR
     *                        (incense sticks live in Bakhoor without a specific subcategory)
     */
    private void validateEligibility(HomepageProductSection section, Product product) {
        if (product.getCategory() == null) {
            throw new BadRequestException("Product has no category assigned");
        }
        CategoryType catType = product.getCategory().getType();
        String sub = product.getSubcategory();
        boolean isCarPerfume = sub != null && (sub.trim().equalsIgnoreCase("Car Perfumes") || sub.trim().equalsIgnoreCase("FRESHENERS"));

        switch (section) {
            case ATTARS -> {
                boolean isPrimaryAttar = (catType == CategoryType.ATTARS);
                boolean hasAttarVariant = (catType == CategoryType.PERFUMES) && 
                        product.getVariants() != null && 
                        product.getVariants().stream().anyMatch(v -> v != null && v.getProductType() == com.alahadattars.enums.ProductType.ATTAR);
                        
                if (!isPrimaryAttar && !hasAttarVariant) {
                    throw new BadRequestException(
                            "Only products that are Attars or contain an Attar variant can be added to the Attars section. " +
                            "This product belongs to: " + catType);
                }
            }
            case PERFUMES_BAKHOOR -> {
                if (isCarPerfume) {
                    throw new BadRequestException(
                            "Car Perfume / Freshener products cannot be added to the Perfumes & Bakhoor section. " +
                            "Use the Car Perfumes & Incense section instead.");
                }
                
                boolean isPrimaryPerfumeOrBakhoor = (catType == CategoryType.PERFUMES || catType == CategoryType.BAKHOOR);
                boolean hasPerfumeVariant = (catType == CategoryType.ATTARS) && 
                        product.getVariants() != null && 
                        product.getVariants().stream().anyMatch(v -> v != null && v.getProductType() == com.alahadattars.enums.ProductType.PERFUME);

                if (!isPrimaryPerfumeOrBakhoor && !hasPerfumeVariant) {
                    throw new BadRequestException(
                            "Only Perfumes, Bakhoor, or products containing a Perfume variant can be added to the Perfumes & Bakhoor section. " +
                            "This product belongs to: " + catType);
                }
            }
            case CAR_PERFUMES_INCENSE -> {
                boolean eligible = isCarPerfume || catType == CategoryType.BAKHOOR;
                if (!eligible) {
                    throw new BadRequestException(
                            "Only Car Perfume products (subcategory = 'Car Perfumes' or 'FRESHENERS') or Bakhoor/Incense products " +
                            "can be added to the Car Perfumes & Incense section. " +
                            "This product: category=" + catType + ", subcategory=" + sub);
                }
            }
        }
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private HomepageProductSlotResponse toResponse(HomepageProductSlot slot) {
        return HomepageProductSlotResponse.builder()
                .id(slot.getId())
                .section(slot.getSection())
                .displayOrder(slot.getDisplayOrder())
                .enabled(slot.isEnabled())
                .product(productMapper.toSummaryResponse(slot.getProduct()))
                .build();
    }
}
