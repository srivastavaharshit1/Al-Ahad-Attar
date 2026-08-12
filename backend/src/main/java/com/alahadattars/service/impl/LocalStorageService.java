package com.alahadattars.service.impl;

import com.alahadattars.exception.BadRequestException;
import com.alahadattars.service.StorageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Dev-only fallback provider: stores files on local disk. Selected when
 * {@code app.storage.provider} (STORAGE_PROVIDER) is unset or "local" — see SupabaseStorageServiceImpl
 * for the provider actually used in deployments with Supabase credentials configured.
 */
@Slf4j
@Service
@ConditionalOnProperty(prefix = "app.storage", name = "provider", havingValue = "local", matchIfMissing = true)
public class LocalStorageService implements StorageService {

    @Value("${app.upload.dir:uploads}")
    private String baseUploadDir;

    @Override
    public String uploadFile(MultipartFile file, String objectKeyPrefix) {
        String extension = StorageService.validateAndDetectExtension(file);
        String objectKey = StorageService.buildObjectKey(objectKeyPrefix, extension);
        try {
            Path filePath = Paths.get(baseUploadDir).resolve(objectKey).toAbsolutePath().normalize();
            Files.createDirectories(filePath.getParent());
            file.transferTo(filePath.toFile());
            log.info("File uploaded locally to: {}", filePath);
            return objectKey;
        } catch (IOException e) {
            log.error("Failed to store file: {}", e.getMessage(), e);
            throw new BadRequestException("Failed to store file: " + e.getMessage());
        }
    }

    @Override
    public void deleteFile(String objectKey) {
        if (objectKey == null || objectKey.isEmpty()) {
            return;
        }
        try {
            Path path = Paths.get(baseUploadDir).resolve(objectKey).toAbsolutePath().normalize();
            Files.deleteIfExists(path);
            log.info("Deleted file locally from: {}", path);
        } catch (IOException e) {
            log.error("Failed to delete file: {}", e.getMessage());
        }
    }

    @Override
    public String publicUrl(String objectKey) {
        // Local disk isn't web-accessible directly — callers proxy through a per-domain
        // "serve file" controller endpoint instead (see resolveUrl's proxyPathFallback).
        return null;
    }
}
