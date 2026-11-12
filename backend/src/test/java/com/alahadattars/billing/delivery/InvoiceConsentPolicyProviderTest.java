package com.alahadattars.billing.delivery;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class InvoiceConsentPolicyProviderTest {
    @Test
    void channelsHaveIndependentExplicitWordingConfiguration() {
        InvoiceConsentPolicyProvider provider = new InvoiceConsentPolicyProvider(
                "email-v1", "Email invoice consent wording", "", "");

        assertTrue(provider.policies().get(0).configured());
        assertFalse(provider.policies().get(1).configured());
        assertEquals("email-v1", provider.requireApprovedWording(InvoiceDeliveryChannel.EMAIL, "email-v1").wordingVersion());
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> provider.requireApprovedWording(InvoiceDeliveryChannel.EMAIL, "unapproved"));
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> provider.requireApprovedWording(InvoiceDeliveryChannel.WHATSAPP, "whatsapp-v1"));
    }
}
