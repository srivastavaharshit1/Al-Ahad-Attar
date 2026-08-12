package com.alahadattars.service.impl;

import com.alahadattars.exception.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Covers the upload validation added to close a stored-XSS gap: the extension alone was
 * previously trusted (a script could be uploaded as "photo.png" or as a real .svg, which browsers
 * can execute as HTML/JS), so every upload must now also match a real image magic-byte signature.
 */
class LocalStorageServiceTest {

    private LocalStorageService service;

    private static final byte[] PNG_HEADER = {
            (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0, 0, 0, 0, 0
    };
    private static final byte[] JPEG_HEADER = {
            (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    };

    @BeforeEach
    void setUp(@TempDir Path tempDir) {
        service = new LocalStorageService();
        ReflectionTestUtils.setField(service, "baseUploadDir", tempDir.toString());
    }

    @Test
    void uploadsValidPngSuccessfully() {
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", PNG_HEADER);

        String path = service.uploadFile(file, "products");

        assertTrue(path.startsWith("products/"));
        assertTrue(path.endsWith(".png"));
    }

    @Test
    void uploadsValidJpegSuccessfully() {
        MockMultipartFile file = new MockMultipartFile("file", "photo.jpg", "image/jpeg", JPEG_HEADER);

        String path = service.uploadFile(file, "products");

        assertTrue(path.endsWith(".jpg"));
    }

    @Test
    void rejectsSvgExtensionOutright_evenWithSvgXmlContent() {
        byte[] svgBytes = "<svg onload=\"alert(document.cookie)\"></svg>".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "logo.svg", "image/svg+xml", svgBytes);

        assertThrows(BadRequestException.class, () -> service.uploadFile(file, "categories"));
    }

    @Test
    void rejectsScriptDisguisedWithAnImageExtension() {
        // A JS/HTML payload renamed to look like a PNG — the classic bypass this fix closes.
        byte[] scriptBytes = "<script>alert(document.cookie)</script>".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", scriptBytes);

        assertThrows(BadRequestException.class, () -> service.uploadFile(file, "products"));
    }

    @Test
    void rejectsDisallowedExtension() {
        MockMultipartFile file = new MockMultipartFile("file", "malware.exe", "application/octet-stream", PNG_HEADER);

        assertThrows(BadRequestException.class, () -> service.uploadFile(file, "products"));
    }

    @Test
    void rejectsFileTooSmallToContainAValidHeader() {
        MockMultipartFile file = new MockMultipartFile("file", "tiny.png", "image/png", new byte[]{1, 2, 3});

        assertThrows(BadRequestException.class, () -> service.uploadFile(file, "products"));
    }

    @Test
    void rejectsMismatchedContentForDeclaredExtension() {
        // Declares .png but the bytes are actually a JPEG header — content wins over extension.
        MockMultipartFile file = new MockMultipartFile("file", "fake.png", "image/png", JPEG_HEADER);

        assertThrows(BadRequestException.class, () -> service.uploadFile(file, "products"));
    }
}
