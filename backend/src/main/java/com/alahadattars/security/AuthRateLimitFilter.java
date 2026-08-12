package com.alahadattars.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.alahadattars.response.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

/**
 * Simple in-memory fixed-window rate limiter for the unauthenticated auth endpoints
 * (login/register/forgot-password/reset-password) — the only endpoints an attacker can hit
 * without a valid token, making them the target for brute force / credential stuffing / mailbox
 * spam. Keyed by client IP; deliberately in-memory (no Redis) since this app runs as a single
 * instance — if it's ever scaled horizontally, this needs to move to a shared store.
 */
@Slf4j
@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private static final Map<String, String> LIMITED_PATHS = Map.of(
            "/api/auth/login", "10:60",
            "/api/auth/register", "5:60",
            "/api/auth/forgot-password", "5:300",
            "/api/auth/reset-password", "10:300"
    );

    // Empty by default — X-Forwarded-For is entirely client-controlled and is only trusted when
    // the direct TCP peer (request.getRemoteAddr()) is itself a known reverse proxy/load balancer
    // in front of this app. Without an allowlist here, an attacker could send a different
    // X-Forwarded-For value on every request and bypass the rate limit entirely. Set to the
    // proxy's IP(s) once one is actually deployed in front of this app.
    @Value("${app.security.trusted-proxies:}")
    private String trustedProxiesConfig;
    // Safe-by-default even if @PostConstruct hasn't run yet (e.g. a plain `new` in a unit test) —
    // an empty set means X-Forwarded-For is never trusted until explicitly configured.
    private Set<String> trustedProxies = Set.of();

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    private record Window(AtomicInteger count, long windowStartMillis) {
    }

    @jakarta.annotation.PostConstruct
    void init() {
        trustedProxies = trustedProxiesConfig == null || trustedProxiesConfig.isBlank()
                ? Set.of()
                : Arrays.stream(trustedProxiesConfig.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toSet());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String limitSpec = LIMITED_PATHS.get(request.getRequestURI());
        if (limitSpec == null || !"POST".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String[] parts = limitSpec.split(":");
        int maxRequests = Integer.parseInt(parts[0]);
        long windowMillis = Long.parseLong(parts[1]) * 1000L;

        String key = request.getRequestURI() + "|" + clientIp(request);
        long now = System.currentTimeMillis();

        Window window = windows.compute(key, (k, existing) -> {
            if (existing == null || now - existing.windowStartMillis() >= windowMillis) {
                return new Window(new AtomicInteger(1), now);
            }
            existing.count().incrementAndGet();
            return existing;
        });

        if (window.count().get() > maxRequests) {
            log.warn("Rate limit exceeded for {} from {} ({} requests in window)", request.getRequestURI(), clientIp(request), window.count().get());
            response.setStatus(429); // HttpStatus.TOO_MANY_REQUESTS
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            ApiResponse<Void> body = ApiResponse.<Void>builder()
                    .success(false)
                    .message("Too many requests. Please wait a moment and try again.")
                    .build();
            objectMapper.writeValue(response.getWriter(), body);
            return;
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Only consults X-Forwarded-For when the direct TCP peer is a configured trusted proxy —
     * otherwise a client can set that header to anything and pick their own rate-limit bucket.
     * Even when trusted, walks the chain right-to-left (the hop closest to us is the most
     * recently added, i.e. the most trustworthy) and returns the first entry that isn't itself a
     * trusted proxy, rather than blindly taking the leftmost (fully client-controlled) entry.
     */
    private String clientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        if (!trustedProxies.contains(remoteAddr)) {
            return remoteAddr;
        }

        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor == null || forwardedFor.isBlank()) {
            return remoteAddr;
        }

        String[] hops = forwardedFor.split(",");
        for (int i = hops.length - 1; i >= 0; i--) {
            String hop = hops[i].trim();
            if (!hop.isEmpty() && !trustedProxies.contains(hop)) {
                return hop;
            }
        }
        return remoteAddr;
    }
}
