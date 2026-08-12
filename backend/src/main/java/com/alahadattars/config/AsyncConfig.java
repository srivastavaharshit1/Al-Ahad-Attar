package com.alahadattars.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.lang.reflect.Method;
import java.util.concurrent.Executor;

/**
 * Dedicated thread pool for {@code @Async} work (currently just EmailService) so slow/blocked
 * mail sending can never compete with or delay request-handling threads. EmailServiceImpl also
 * catches every exception internally, but the handler below is a second safety net — if one
 * ever escapes, it's logged here instead of silently vanishing or crashing the async thread.
 */
@Slf4j
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {

    @Bean(name = "emailTaskExecutor")
    public Executor emailTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("EmailAsync-");
        executor.initialize();
        return executor;
    }

    /**
     * Lets PublicHomepageServiceImpl fetch its ~7 independent sections (heroes, banners,
     * categories, featured products, testimonials, ...) concurrently instead of one DB round trip
     * after another — wall-clock drops from the sum of every query's latency to roughly the
     * slowest single one. Capped at 4 (below Hikari's default 5-connection pool) so one homepage
     * request can't starve every other connection in the pool by itself.
     */
    @Bean(name = "homepageTaskExecutor")
    public Executor homepageTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("HomepageAsync-");
        executor.initialize();
        return executor;
    }

    @Override
    public Executor getAsyncExecutor() {
        return emailTaskExecutor();
    }

    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (Throwable ex, Method method, Object... params) ->
                log.error("Uncaught exception in async method '{}': {}", method.getName(), ex.getMessage(), ex);
    }
}
