package com.alahadattars.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class CacheConfig {

    @Value("${cache.products.ttl:5}")
    private long productsTtl;

    @Value("${cache.products.max-size:500}")
    private long productsMaxSize;

    @Value("${cache.categories.ttl:60}")
    private long categoriesTtl;

    @Value("${cache.categories.max-size:50}")
    private long categoriesMaxSize;

    @Value("${cache.homepage.ttl:30}")
    private long homepageTtl;

    @Value("${cache.homepage.max-size:50}")
    private long homepageMaxSize;

    @Bean
    public CacheManager cacheManager() {
        SimpleCacheManager cacheManager = new SimpleCacheManager();
        
        cacheManager.setCaches(Arrays.asList(
            buildCache("products", productsTtl, TimeUnit.MINUTES, productsMaxSize),
            buildCache("categories", categoriesTtl, TimeUnit.MINUTES, categoriesMaxSize),
            buildCache("homepage", homepageTtl, TimeUnit.MINUTES, homepageMaxSize)
        ));
        
        return cacheManager;
    }

    private CaffeineCache buildCache(String name, long duration, TimeUnit unit, long maxSize) {
        return new CaffeineCache(name, Caffeine.newBuilder()
            .expireAfterWrite(duration, unit)
            .maximumSize(maxSize)
            .build());
    }
}
