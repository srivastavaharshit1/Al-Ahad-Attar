package com.alahadattars.service.notification.impl;

import com.alahadattars.entity.Address;
import com.alahadattars.entity.Order;
import com.alahadattars.service.notification.NotificationProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.time.format.DateTimeFormatter;

@Slf4j
@Component
public class WhatsAppNotificationProvider implements NotificationProvider {

    @Value("${admin.whatsapp.number:}")
    private String adminWhatsappNumber;

    @Override
    public void sendNewOrderNotification(Order order) {
        // Build the message as per the template
        String message = buildMessage(order);
        
        // Simulating WhatsApp API call.
        // In a real implementation, you'd use Twilio, Meta Graph API, or another WhatsApp Business API provider.
        log.info("--- WHATSAPP NOTIFICATION SIMULATION ---");
        log.info("To: {}", adminWhatsappNumber);
        log.info("Message Payload:\n{}", message);
        log.info("----------------------------------------");
    }

    @Override
    public void sendRefundPendingNotification(Order order) {
        String customerPhone = order.getShippingAddress() != null ? order.getShippingAddress().getPhone() : null;
        String customerName = order.getShippingAddress() != null
                ? order.getShippingAddress().getFullName()
                : order.getUser().getFirstName() + " " + order.getUser().getLastName();

        String message = String.format(
                "Dear %s,\n\nYour order #%s has been successfully cancelled.\n\n" +
                "Your refund of ₹%s is now pending admin approval and will be initiated shortly.\n\n" +
                "You will receive another notification once the refund is processed.\n\n" +
                "Thank you for your patience.",
                customerName, order.getOrderNumber(),
                order.getRefundAmount() != null ? order.getRefundAmount() : order.getTotalAmount()
        );

        log.info("--- WHATSAPP REFUND PENDING NOTIFICATION (SIMULATION) ---");
        log.info("To Customer: {}", customerPhone);
        log.info("Message:\n{}", message);
        log.info("---------------------------------------------------------");
    }

    @Override
    public void sendRefundCompletedNotification(Order order) {
        String customerPhone = order.getShippingAddress() != null ? order.getShippingAddress().getPhone() : null;
        String customerName = order.getShippingAddress() != null
                ? order.getShippingAddress().getFullName()
                : order.getUser().getFirstName() + " " + order.getUser().getLastName();

        String message = String.format(
                "Dear %s,\n\nGreat news! Your refund for order #%s has been successfully processed.\n\n" +
                "Amount Refunded: ₹%s\n" +
                "Refund ID: %s\n\n" +
                "Please allow 5–7 business days for the amount to reflect in your account.\n\n" +
                "Thank you for shopping with Al Ahad Attars.",
                customerName, order.getOrderNumber(),
                order.getRefundAmount() != null ? order.getRefundAmount() : order.getTotalAmount(),
                order.getRefundId() != null ? order.getRefundId() : "N/A"
        );

        log.info("--- WHATSAPP REFUND COMPLETED NOTIFICATION (SIMULATION) ---");
        log.info("To Customer: {}", customerPhone);
        log.info("Message:\n{}", message);
        log.info("-----------------------------------------------------------");
    }

    private String buildMessage(Order order) {
        Address addr = order.getShippingAddress();
        String customerName = addr != null ? addr.getFullName() : order.getUser().getFirstName() + " " + order.getUser().getLastName();
        String date = order.getCreatedAt() != null ? order.getCreatedAt().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a")) : "N/A";
        int itemsCount = order.getItems().stream().mapToInt(com.alahadattars.entity.OrderItem::getQuantity).sum();
        
        return String.format(
            "New Order Received\n\n" +
            "Order #%s\n\n" +
            "Customer:\n%s\n\n" +
            "Amount:\n₹%s\n\n" +
            "Items:\n%d\n\n" +
            "Payment:\n%s\n\n" +
            "Status:\n%s\n\n" +
            "Date:\n%s\n\n" +
            "Please process the order.",
            order.getOrderNumber(),
            customerName,
            order.getTotalAmount().toString(),
            itemsCount,
            order.getPaymentStatus() != null ? order.getPaymentStatus().name() : "N/A",
            order.getStatus() != null ? order.getStatus().name() : "N/A",
            date
        );
    }
}
