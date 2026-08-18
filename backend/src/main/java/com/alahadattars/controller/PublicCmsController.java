package com.alahadattars.controller;

import com.alahadattars.entity.CmsPage;
import com.alahadattars.service.CmsPageService;
import com.alahadattars.service.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public/cms")
@RequiredArgsConstructor
public class PublicCmsController {

    private final CmsPageService cmsPageService;
    private final StorageService storageService;

    @GetMapping("/{pageKey}")
    public ResponseEntity<CmsPage> getPage(@PathVariable String pageKey) {
        return cmsPageService.getPage(pageKey)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

}
