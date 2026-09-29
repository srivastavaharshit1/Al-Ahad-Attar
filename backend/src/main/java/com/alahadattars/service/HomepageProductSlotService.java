package com.alahadattars.service;

import com.alahadattars.dto.homepage.HomepageProductSectionResponse;
import com.alahadattars.dto.homepage.HomepageProductSlotRequest;
import com.alahadattars.dto.homepage.HomepageProductSlotResponse;
import com.alahadattars.enums.HomepageProductSection;

import java.util.List;

public interface HomepageProductSlotService {

    /** Admin: get all slots for a section (includes disabled ones). */
    List<HomepageProductSlotResponse> getSlotsForSection(HomepageProductSection section);

    /** Admin: add a product to a section, validating category eligibility. */
    HomepageProductSlotResponse addSlot(HomepageProductSection section, HomepageProductSlotRequest request);

    /** Admin: remove a slot by its ID. */
    void removeSlot(Long slotId);

    /** Admin: toggle enabled/disabled for a slot. */
    HomepageProductSlotResponse setEnabled(Long slotId, boolean enabled);

    /** Admin: reorder slots within a section. */
    void reorder(HomepageProductSection section, List<ReorderSlotEntry> order);

    /** Customer: get all three sections with only enabled+active products. */
    List<HomepageProductSectionResponse> getAllSectionsForCustomer();

    /** Used when a product is deleted to orphan-clean its slots. */
    void deleteSlotsByProductId(Long productId);

    record ReorderSlotEntry(Long slotId, int displayOrder) {}
}
