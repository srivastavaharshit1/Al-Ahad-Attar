package com.alahadattars.controller;

import com.alahadattars.entity.CmsPage;
import com.alahadattars.service.CmsPageService;
import com.alahadattars.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/cms")
@RequiredArgsConstructor
public class AdminCmsController {

    private final CmsPageService cmsPageService;
    private final StorageService storageService;

    @GetMapping("/{pageKey}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CmsPage> getPage(@PathVariable String pageKey) {
        return cmsPageService.getPage(pageKey)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{pageKey}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CmsPage> updatePage(@PathVariable String pageKey, @RequestBody Map<String, Object> payload) {
        String contentJson = (String) payload.get("contentJson");
        if (contentJson == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(cmsPageService.updatePage(pageKey, contentJson));
    }

    @PostMapping("/upload-image")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> uploadImage(@RequestParam("file") MultipartFile file) {
        String objectKey = storageService.uploadFile(file, "cms");
        String url = storageService.resolveUrl(objectKey, "/api/public/cms/images/" + objectKey);
        return ResponseEntity.ok(Map.of("url", url));
    }
}
