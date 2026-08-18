package com.alahadattars.service;

import com.alahadattars.entity.CmsPage;
import com.alahadattars.repository.CmsPageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CmsPageService {

    private final CmsPageRepository cmsPageRepository;

    public Optional<CmsPage> getPage(String pageKey) {
        return cmsPageRepository.findById(pageKey);
    }

    @Transactional
    public CmsPage updatePage(String pageKey, String contentJson) {
        CmsPage page = cmsPageRepository.findById(pageKey)
                .orElse(CmsPage.builder().pageKey(pageKey).build());
        page.setContentJson(contentJson);
        return cmsPageRepository.save(page);
    }
}
