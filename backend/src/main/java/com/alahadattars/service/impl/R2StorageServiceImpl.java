package com.alahadattars.service.impl;

import com.alahadattars.exception.BadRequestException;
import com.alahadattars.service.StorageService;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.net.URI;

/**
 * Production storage provider — Cloudflare R2, via its S3-compatible API (no R2-specific SDK
 * exists; the standard AWS S3 client works unmodified once pointed at R2's account endpoint with
 * path-style addressing). Selected when app.storage.provider=r2 (STORAGE_PROVIDER=r2).
 *
 * Credentials (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY) are read server-side only
 * and never appear in any API response — see StorageService's javadoc for why business code
 * never references this class directly.
 *
 * Public delivery deliberately bypasses this app: publicUrl() returns R2_PUBLIC_URL (R2's own
 * public bucket domain or a custom domain fronted by Cloudflare's CDN) + objectKey, so the
 * browser fetches images straight from Cloudflare — Spring Boot is never in that request path.
 */
@Slf4j
@Service
@ConditionalOnProperty(prefix = "app.storage", name = "provider", havingValue = "r2")
public class R2StorageServiceImpl implements StorageService {

    private final S3Client s3Client;

    @Value("${app.storage.r2.bucket}")
    private String bucket;

    @Value("${app.storage.r2.public-url}")
    private String publicUrlBase;

    public R2StorageServiceImpl(
            @Value("${app.storage.r2.account-id}") String accountId,
            @Value("${app.storage.r2.access-key-id}") String accessKeyId,
            @Value("${app.storage.r2.secret-access-key}") String secretAccessKey) {
        if (accountId == null || accountId.isBlank() || accessKeyId == null || accessKeyId.isBlank()
                || secretAccessKey == null || secretAccessKey.isBlank()) {
            throw new IllegalStateException(
                    "STORAGE_PROVIDER=r2 requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY to be set.");
        }
        this.s3Client = S3Client.builder()
                .httpClientBuilder(software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient.builder())
                .endpointOverride(URI.create("https://" + accountId + ".r2.cloudflarestorage.com"))
                .region(Region.of("auto"))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKeyId, secretAccessKey)))
                // R2 only supports path-style bucket addressing (bucket in the URL path), not the
                // AWS-style virtual-hosted "<bucket>.<endpoint>" form the SDK defaults to.
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
                .build();
    }

    @PostConstruct
    void validateConfig() {
        // Fail fast at boot rather than on the first upload request — same convention as
        // DB_URL/JWT_SECRET elsewhere in this app.
        if (bucket == null || bucket.isBlank() || publicUrlBase == null || publicUrlBase.isBlank()) {
            throw new IllegalStateException(
                    "STORAGE_PROVIDER=r2 requires R2_BUCKET and R2_PUBLIC_URL to be set.");
        }
    }

    @Override
    public String uploadFile(MultipartFile file, String objectKeyPrefix) {
        String extension = StorageService.validateAndDetectExtension(file);
        String objectKey = StorageService.buildObjectKey(objectKeyPrefix, extension);
        try {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(objectKey)
                            .contentType(contentTypeFor(extension))
                            .build(),
                    RequestBody.fromBytes(file.getBytes()));
            log.info("Uploaded object to R2: {}", objectKey);
            return objectKey;
        } catch (IOException e) {
            throw new BadRequestException("Failed to read uploaded file: " + e.getMessage());
        } catch (SdkException e) {
            log.error("R2 upload failed for {}: {}", objectKey, e.getMessage());
            throw new BadRequestException("Failed to upload image to storage.");
        }
    }

    @Override
    public void deleteFile(String objectKey) {
        if (objectKey == null || objectKey.isEmpty()) {
            return;
        }
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(objectKey).build());
            log.info("Deleted object from R2: {}", objectKey);
        } catch (SdkException e) {
            // Best-effort: a stale/missing object shouldn't block the caller's own delete flow.
            log.warn("Failed to delete R2 object {}: {}", objectKey, e.getMessage());
        }
    }

    @Override
    public String publicUrl(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return null;
        }
        String base = publicUrlBase.endsWith("/") ? publicUrlBase.substring(0, publicUrlBase.length() - 1) : publicUrlBase;
        return base + "/" + objectKey;
    }

    private String contentTypeFor(String extension) {
        return switch (extension) {
            case "jpg", "jpeg" -> "image/jpeg";
            case "png" -> "image/png";
            case "gif" -> "image/gif";
            case "webp" -> "image/webp";
            default -> "application/octet-stream";
        };
    }
}
