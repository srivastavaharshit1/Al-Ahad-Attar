package com.alahadattars.entity;

import com.alahadattars.enums.PromotionScope;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class PromotionConfigurationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void deserializesLegacyJsonSafelyAndIgnoresBuyProductId() throws Exception {
        String legacyJson = """
        {
          "buyProductId": 123,
          "buyScope": "SPECIFIC_PRODUCT",
          "buyVariantIds": [456]
        }
        """;

        PromotionConfiguration config = objectMapper.readValue(legacyJson, PromotionConfiguration.class);

        // Verify deserialization succeeds and modern fields are preserved
        assertEquals(PromotionScope.SPECIFIC_PRODUCT, config.getBuyScope());
        assertEquals(List.of(456L), config.getBuyVariantIds());

        // Verify re-serializing does NOT contain the legacy field
        String serialized = objectMapper.writeValueAsString(config);
        assertFalse(serialized.contains("\"buyProductId\""));
        assertTrue(serialized.contains("\"buyScope\":\"SPECIFIC_PRODUCT\""));
        assertTrue(serialized.contains("\"buyVariantIds\":[456]"));
    }
}
