package com.alahadattars.util;

import com.alahadattars.entity.PromotionConfiguration;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;

@Converter
@Slf4j
public class PromotionConfigurationConverter implements AttributeConverter<PromotionConfiguration, String> {

    private static final ObjectMapper mapper = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(PromotionConfiguration attribute) {
        if (attribute == null) return null;
        try {
            return mapper.writeValueAsString(attribute);
        } catch (JsonProcessingException e) {
            log.error("Error converting PromotionConfiguration to JSON", e);
            throw new RuntimeException("Error converting PromotionConfiguration to JSON", e);
        }
    }

    @Override
    public PromotionConfiguration convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.trim().isEmpty()) return null;
        try {
            // Handle H2 double encoding if it exists
            if (dbData.startsWith("\"") && dbData.endsWith("\"")) {
                dbData = mapper.readValue(dbData, String.class);
            }
            return mapper.readValue(dbData, PromotionConfiguration.class);
        } catch (JsonProcessingException e) {
            log.error("Error reading PromotionConfiguration from JSON", e);
            throw new RuntimeException("Error reading PromotionConfiguration from JSON", e);
        }
    }
}
