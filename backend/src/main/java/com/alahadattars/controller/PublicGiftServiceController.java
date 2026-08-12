package com.alahadattars.controller;

import com.alahadattars.dto.gift.GiftServiceResponse;
import com.alahadattars.response.ApiResponse;
import com.alahadattars.service.GiftServiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.alahadattars.repository.GiftServiceRepository;
import com.alahadattars.entity.GiftService;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@RestController
@RequestMapping("/api/gift-services")
@RequiredArgsConstructor
@Tag(name = "Gift Services", description = "Public endpoints for gift service options on checkout")
public class PublicGiftServiceController {

    private final GiftServiceService giftServiceService;
    private final GiftServiceRepository giftServiceRepository;

    @Operation(summary = "Get all active gift services for checkout")
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<GiftServiceResponse>>> getActiveServices() {
        List<GiftServiceResponse> services = giftServiceService.getActiveServices();
        return ResponseEntity.ok(ApiResponse.<List<GiftServiceResponse>>builder()
                .success(true)
                .message("Active gift services retrieved")
                .data(services)
                .build());
    }

    @Operation(summary = "Get image for a gift service")
    @GetMapping("/{id}/image")
    public ResponseEntity<?> serveImage(@PathVariable Long id) {
        GiftService service = giftServiceRepository.findById(id).orElse(null);
        if (service == null || service.getImageUrl() == null || service.getImageUrl().isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        String url = service.getImageUrl();
        if (url.startsWith("http://") || url.startsWith("https://")) {
            // Already on external storage (e.g. Supabase Storage, seed-data placeholders) —
            // redirect rather than trying to resolve it as a local upload path.
            return ResponseEntity.status(302).location(java.net.URI.create(url)).build();
        }

        try {
            Path path = Paths.get(url);
            Resource resource = new UrlResource(path.toUri());

            if (resource.exists() || resource.isReadable()) {
                return ResponseEntity.ok()
                        .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
