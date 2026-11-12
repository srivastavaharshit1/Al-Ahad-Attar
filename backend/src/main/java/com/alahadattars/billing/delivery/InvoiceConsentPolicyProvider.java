package com.alahadattars.billing.delivery;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class InvoiceConsentPolicyProvider {
    private final String emailVersion;
    private final String emailWording;
    private final String whatsAppVersion;
    private final String whatsAppWording;

    public InvoiceConsentPolicyProvider(
            @Value("${billing.delivery.consent.email.version:}") String emailVersion,
            @Value("${billing.delivery.consent.email.wording:}") String emailWording,
            @Value("${billing.delivery.consent.whatsapp.version:}") String whatsAppVersion,
            @Value("${billing.delivery.consent.whatsapp.wording:}") String whatsAppWording) {
        this.emailVersion = emailVersion;
        this.emailWording = emailWording;
        this.whatsAppVersion = whatsAppVersion;
        this.whatsAppWording = whatsAppWording;
    }

    public List<InvoiceConsentPolicy> policies() {
        return List.of(policy(InvoiceDeliveryChannel.EMAIL), policy(InvoiceDeliveryChannel.WHATSAPP));
    }

    public InvoiceConsentPolicy requireApprovedWording(InvoiceDeliveryChannel channel, String version) {
        InvoiceConsentPolicy policy = policy(channel);
        if (!policy.configured() || !policy.wordingVersion().equals(version)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
                    "Approved consent wording is not configured for this channel");
        }
        return policy;
    }

    private InvoiceConsentPolicy policy(InvoiceDeliveryChannel channel) {
        String version = channel == InvoiceDeliveryChannel.EMAIL ? emailVersion : whatsAppVersion;
        String wording = channel == InvoiceDeliveryChannel.EMAIL ? emailWording : whatsAppWording;
        boolean configured = version != null && !version.isBlank() && wording != null && !wording.isBlank();
        return new InvoiceConsentPolicy(channel, version == null ? "" : version,
                wording == null ? "" : wording, configured);
    }
}
