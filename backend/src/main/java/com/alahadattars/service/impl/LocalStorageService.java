package com.alahadattars.service.impl;

import com.alahadattars.exception.BadRequestException;
import com.alahadattars.service.UploadService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;

@Slf4j
@Service
public class LocalStorageService implements UploadService {

    @Value("${app.upload.dir:uploads}")
    private String baseUploadDir;

    @Override
    public String uploadFile(MultipartFile file, String directory) {
        try {
            // directory might be "products", "categories", or "uploads/logos"
            // we will strip "uploads/" if it's already there to avoid uploads/uploads/logos
            if (directory != null && directory.startsWith("uploads/")) {
                directory = directory.substring("uploads/".length());
            }
            if (directory != null && directory.startsWith("uploads\\")) {
                directory = directory.substring("uploads\\".length());
            }

            Path uploadPath = Paths.get(baseUploadDir, directory).toAbsolutePath().normalize();
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            
            String uniqueFilename = UUID.randomUUID().toString() + extension;
            Path filePath = uploadPath.resolve(uniqueFilename);
            
            file.transferTo(filePath.toFile());
            log.info("File uploaded locally to: {}", filePath.toString());
            
            // Return relative path to store in DB: e.g. "products/uuid.jpg"
            String relativePath = Paths.get(directory, uniqueFilename).toString().replace("\\", "/");
            return relativePath;
        } catch (IOException e) {
            log.error("Failed to store file: {}", e.getMessage(), e);
            throw new BadRequestException("Failed to store file: " + e.getMessage());
        }
    }

    @Override
    public void deleteFile(String filePath) {
        if (filePath == null || filePath.isEmpty()) {
            return;
        }
        try {
            Path path = Paths.get(baseUploadDir).resolve(filePath).toAbsolutePath().normalize();
            Files.deleteIfExists(path);
            log.info("Deleted file locally from: {}", path);
        } catch (IOException e) {
            log.error("Failed to delete file: {}", e.getMessage());
        }
    }
}
