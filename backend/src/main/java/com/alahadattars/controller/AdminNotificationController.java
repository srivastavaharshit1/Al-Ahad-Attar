package com.alahadattars.controller;

import com.alahadattars.response.ApiResponse;
import com.alahadattars.dto.notification.AdminNotificationResponse;
import com.alahadattars.dto.notification.AdminNotificationUnreadCountResponse;
import com.alahadattars.service.AdminNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/notifications")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminNotificationController {

    private final AdminNotificationService adminNotificationService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<AdminNotificationResponse>>> getRecentNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Page<AdminNotificationResponse> notifications = adminNotificationService.getRecentNotifications(PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.<Page<AdminNotificationResponse>>builder()
                .success(true)
                .message("Notifications retrieved successfully")
                .data(notifications)
                .build());
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<AdminNotificationUnreadCountResponse>> getUnreadCount() {
        AdminNotificationUnreadCountResponse count = adminNotificationService.getUnreadCount();
        return ResponseEntity.ok(ApiResponse.<AdminNotificationUnreadCountResponse>builder()
                .success(true)
                .message("Unread count retrieved successfully")
                .data(count)
                .build());
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable Long id) {
        adminNotificationService.markAsRead(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("Notification marked as read")
                .build());
    }

    @PutMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead() {
        adminNotificationService.markAllAsRead();
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message("All notifications marked as read")
                .build());
    }
}
