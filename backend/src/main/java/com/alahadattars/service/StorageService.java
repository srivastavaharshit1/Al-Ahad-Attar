package com.alahadattars.service;

import com.alahadattars.exception.BadRequestException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;

/**
 * Provider-independent storage abstraction. The rest of the app (ProductImageService,
 * ReviewService, CategoryService, HomepageService, ...) depends only on this interface and
 * never on a specific provider (Supabase, local disk, or a future Cloudflare R2) — the active
 * provider is chosen at startup by {@code app.storage.provider} (STORAGE_PROVIDER), see
 * SupabaseStorageServiceImpl / LocalStorageService.
 *
 * Uploads store the returned objectKey (e.g. "products/12/&lt;uuid&gt;.webp") rather than a
 * permanent provider-specific URL, so switching providers never requires touching stored rows —
 * see STORAGE_MIGRATION.md.
 */
public interface StorageService {

    Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "gif");

    /**
     * Uploads the file under a stable, provider-independent objectKey built from
     * {@code objectKeyPrefix} (e.g. "products/12", "reviews/34", "categories/5", "banners") and
     * a random UUID. Returns the objectKey to persist on the owning entity.
     */
    String uploadFile(MultipartFile file, String objectKeyPrefix);

    /** Deletes a previously-stored objectKey. No-ops on blank input. */
    void deleteFile(String objectKey);

    /**
     * This provider's direct public URL for an objectKey, or null if the provider can't serve
     * one directly (e.g. local disk) — callers should fall back to a server-side proxy endpoint.
     */
    String publicUrl(String objectKey);

    /**
     * Centralizes what every image-serving mapper/service used to duplicate: a blank value
     * resolves to null, a legacy absolute URL (pre-migration rows, seed-data placeholders)
     * passes through unchanged, and our own stored objectKeys resolve through the active
     * provider — falling back to {@code proxyPathFallback} when the provider has no direct
     * public URL for it.
     */
    default String resolveUrl(String storedValue, String proxyPathFallback) {
        if (storedValue == null || storedValue.isBlank()) {
            return null;
        }
        if (storedValue.startsWith("http://") || storedValue.startsWith("https://") || storedValue.startsWith("data:")) {
            return storedValue;
        }
        String url = publicUrl(storedValue);
        return url != null ? url : proxyPathFallback;
    }

    /**
     * Never trust the extension alone (a script can be renamed "photo.png") — confirms the
     * file's actual bytes match a real image format. SVG is deliberately excluded from
     * ALLOWED_EXTENSIONS: it's an XML format that can embed &lt;script&gt;, and these files are
     * served back inline to every site visitor viewing a product/review image.
     */
    static String validateAndDetectExtension(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase();
        }
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("Unsupported file type. Allowed: jpg, jpeg, png, webp, gif.");
        }
        if (!matchesImageSignature(readHeader(file), extension)) {
            throw new BadRequestException("File content does not match a valid image of the declared type.");
        }
        return extension;
    }

    /** Builds a stable "{prefix}/{uuid}.{extension}" objectKey, e.g. "products/12/&lt;uuid&gt;.webp". */
    static String buildObjectKey(String objectKeyPrefix, String extension) {
        String prefix = objectKeyPrefix == null ? "" : objectKeyPrefix.replaceAll("^/+|/+$", "");
        String filename = UUID.randomUUID() + "." + extension;
        return prefix.isEmpty() ? filename : prefix + "/" + filename;
    }

    private static byte[] readHeader(MultipartFile file) {
        byte[] header = new byte[16];
        try (var in = file.getInputStream()) {
            int read = in.readNBytes(header, 0, header.length);
            if (read < header.length) {
                throw new BadRequestException("File is too small to be a valid image.");
            }
        } catch (IOException e) {
            throw new BadRequestException("Failed to read file: " + e.getMessage());
        }
        return header;
    }

    private static boolean matchesImageSignature(byte[] header, String extension) {
        return switch (extension) {
            case "jpg", "jpeg" -> (header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF;
            case "png" -> (header[0] & 0xFF) == 0x89 && header[1] == 'P' && header[2] == 'N' && header[3] == 'G'
                    && header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A;
            case "gif" -> header[0] == 'G' && header[1] == 'I' && header[2] == 'F' && header[3] == '8'
                    && (header[4] == '7' || header[4] == '9') && header[5] == 'a';
            case "webp" -> header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F'
                    && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P';
            default -> false;
        };
    }
}
