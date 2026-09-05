package com.alahadattars.repository;

import com.alahadattars.entity.WebhookEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface WebhookEventRepository extends JpaRepository<WebhookEvent, String> {
    Optional<WebhookEvent> findByEventId(String eventId);
    
    // Allows finding if an event exists for a specific payment
    Optional<WebhookEvent> findByPaymentIdAndEventType(String paymentId, String eventType);
}
