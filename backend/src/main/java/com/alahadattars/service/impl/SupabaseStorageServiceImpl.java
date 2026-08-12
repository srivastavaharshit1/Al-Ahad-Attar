package com.alahadattars.service.impl;

import com.alahadattars.exception.BadRequestException;
import com.alahadattars.service.StorageService;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;

/**
 * Active storage provider — talks to the Supabase Storage REST API directly (no Supabase Java
 * SDK exists; this is a thin client over their documented HTTP endpoints) using the service-role
 * key, which never leaves the backend. Selected when app.storage.provider=supabase
 * (STORAGE_PROVIDER=supabase).
 *
 * Business code (ProductImageService, ReviewService, CategoryService, HomepageService, ...) never
 * references this class directly — it depends only on StorageService. Swapping to Cloudflare R2
 * later means adding one sibling implementation and changing STORAGE_PROVIDER; see
 * STORAGE_MIGRATION.md.
 */
@Slf4j
@Service
@ConditionalOnProperty(prefix = "app.storage", name = "provider", havingValue = "supabase")
public class SupabaseStorageServiceImpl implements StorageService {

    private final RestClient restClient;

    @Value("${app.storage.supabase.url}")
    private String supabaseUrl;

    @Value("${app.storage.supabase.service-role-key}")
    private String serviceRoleKey;

    @Value("${app.storage.supabase.bucket:media}")
    private String bucket;

    public SupabaseStorageServiceImpl(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder.build();
    }

    @PostConstruct
    void validateConfig() {
        // Fail fast at boot rather than on the first upload request — same convention as
        // DB_URL/JWT_SECRET elsewhere in this app.
        if (supabaseUrl == null || supabaseUrl.isBlank() || serviceRoleKey == null || serviceRoleKey.isBlank()) {
            throw new IllegalStateException(
                    "STORAGE_PROVIDER=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set.");
        }
    }

    @Override
    public String uploadFile(MultipartFile file, String objectKeyPrefix) {
        String extension = StorageService.validateAndDetectExtension(file);
        String objectKey = StorageService.buildObjectKey(objectKeyPrefix, extension);
        try {
            restClient.post()
                    .uri(objectUri(objectKey))
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey)
                    .header("apikey", serviceRoleKey)
                    .contentType(contentTypeFor(extension))
                    .body(file.getBytes())
                    .retrieve()
                    .toBodilessEntity();
            log.info("Uploaded object to Supabase Storage: {}", objectKey);
            return objectKey;
        } catch (IOException e) {
            throw new BadRequestException("Failed to read uploaded file: " + e.getMessage());
        } catch (RestClientResponseException e) {
            log.error("Supabase Storage upload failed ({}): {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new BadRequestException("Failed to upload image to storage.");
        }
    }

    @Override
    public void deleteFile(String objectKey) {
        if (objectKey == null || objectKey.isEmpty()) {
            return;
        }
        try {
            restClient.delete()
                    .uri(objectUri(objectKey))
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey)
                    .header("apikey", serviceRoleKey)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Deleted object from Supabase Storage: {}", objectKey);
        } catch (RestClientResponseException e) {
            // Best-effort: a stale/missing object shouldn't block the caller's own delete flow.
            log.warn("Failed to delete Supabase Storage object {}: {}", objectKey, e.getMessage());
        }
    }

    @Override
    public String publicUrl(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return null;
        }
        return supabaseUrl + "/storage/v1/object/public/" + bucket + "/" + objectKey;
    }

    /**
     * Built via URI.create rather than a RestClient "{key}" template variable — UriComponentsBuilder
     * would percent-encode the "/" separators inside objectKey (e.g. "products/12/uuid.webp"),
     * breaking the path. objectKey only ever contains characters we generated ourselves
     * (lowercase prefix segments, "/", a UUID, ".", extension), so raw concatenation is safe.
     */
    private URI objectUri(String objectKey) {
        return URI.create(supabaseUrl + "/storage/v1/object/" + bucket + "/" + objectKey);
    }

    private MediaType contentTypeFor(String extension) {
        return switch (extension) {
            case "jpg", "jpeg" -> MediaType.IMAGE_JPEG;
            case "png" -> MediaType.IMAGE_PNG;
            case "gif" -> MediaType.IMAGE_GIF;
            case "webp" -> MediaType.parseMediaType("image/webp");
            default -> MediaType.APPLICATION_OCTET_STREAM;
        };
    }
}
