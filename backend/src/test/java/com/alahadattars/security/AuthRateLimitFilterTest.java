package com.alahadattars.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * Covers the in-memory windowed rate limiter that protects the unauthenticated auth endpoints
 * (login/register/forgot-password/reset-password) from brute force / credential stuffing.
 */
class AuthRateLimitFilterTest {

    private final AuthRateLimitFilter filter = new AuthRateLimitFilter();

    private MockHttpServletRequest loginRequest(String ip) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.setRemoteAddr(ip);
        return request;
    }

    @Test
    void allowsRequestsUnderTheLimit() throws Exception {
        FilterChain chain = mock(FilterChain.class);

        for (int i = 0; i < 10; i++) {
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilterInternal(loginRequest("1.1.1.1"), response, chain);
            assertEquals(200, response.getStatus());
        }

        verify(chain, times(10)).doFilter(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void blocksRequestsOverTheLimit_returns429() throws Exception {
        FilterChain chain = mock(FilterChain.class);

        for (int i = 0; i < 10; i++) {
            filter.doFilterInternal(loginRequest("2.2.2.2"), new MockHttpServletResponse(), chain);
        }

        MockHttpServletResponse blockedResponse = new MockHttpServletResponse();
        filter.doFilterInternal(loginRequest("2.2.2.2"), blockedResponse, chain);

        assertEquals(429, blockedResponse.getStatus());
        assertEquals("application/json", blockedResponse.getContentType());
        verify(chain, times(10)).doFilter(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void tracksEachIpIndependently() throws Exception {
        FilterChain chain = mock(FilterChain.class);

        for (int i = 0; i < 10; i++) {
            filter.doFilterInternal(loginRequest("3.3.3.3"), new MockHttpServletResponse(), chain);
        }
        MockHttpServletResponse blockedResponse = new MockHttpServletResponse();
        filter.doFilterInternal(loginRequest("3.3.3.3"), blockedResponse, chain);
        assertEquals(429, blockedResponse.getStatus());

        // A different IP against the same endpoint is unaffected by 3.3.3.3's exhausted quota.
        MockHttpServletResponse otherIpResponse = new MockHttpServletResponse();
        filter.doFilterInternal(loginRequest("4.4.4.4"), otherIpResponse, chain);
        assertEquals(200, otherIpResponse.getStatus());
    }

    @Test
    void nonLimitedPathsPassThroughUnaffected() throws Exception {
        FilterChain chain = mock(FilterChain.class);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/products");
        request.setRemoteAddr("5.5.5.5");

        for (int i = 0; i < 50; i++) {
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilterInternal(request, response, chain);
            assertEquals(200, response.getStatus());
        }
    }

    @Test
    void ignoresXForwardedForByDefault_untrustedPeerCannotSpoofIp() throws Exception {
        // Without a configured trusted proxy, X-Forwarded-For must be ignored entirely — otherwise
        // an attacker sends a different value on every request and never gets rate-limited at all.
        FilterChain chain = mock(FilterChain.class);

        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
            request.setRemoteAddr("7.7.7.7");
            request.addHeader("X-Forwarded-For", "spoofed-" + i); // different every time
            filter.doFilterInternal(request, new MockHttpServletResponse(), chain);
        }

        MockHttpServletRequest blockedRequest = new MockHttpServletRequest("POST", "/api/auth/login");
        blockedRequest.setRemoteAddr("7.7.7.7");
        blockedRequest.addHeader("X-Forwarded-For", "yet-another-spoofed-value");
        MockHttpServletResponse blockedResponse = new MockHttpServletResponse();
        filter.doFilterInternal(blockedRequest, blockedResponse, chain);

        assertEquals(429, blockedResponse.getStatus());
    }

    @Test
    void honorsXForwardedFor_onlyWhenDirectPeerIsATrustedProxy() throws Exception {
        ReflectionTestUtils.setField(filter, "trustedProxies", Set.of("10.0.0.1"));
        FilterChain chain = mock(FilterChain.class);

        for (int i = 0; i < 5; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/register");
            request.setRemoteAddr("10.0.0.1"); // the configured trusted proxy
            request.addHeader("X-Forwarded-For", "6.6.6.6");
            filter.doFilterInternal(request, new MockHttpServletResponse(), chain);
        }

        MockHttpServletRequest blockedRequest = new MockHttpServletRequest("POST", "/api/auth/register");
        blockedRequest.setRemoteAddr("10.0.0.1");
        blockedRequest.addHeader("X-Forwarded-For", "6.6.6.6");
        MockHttpServletResponse blockedResponse = new MockHttpServletResponse();
        filter.doFilterInternal(blockedRequest, blockedResponse, chain);

        assertEquals(429, blockedResponse.getStatus());
    }

    @Test
    void xForwardedFor_parsedRightToLeft_skippingTrustedHops() throws Exception {
        // Chain: original client (9.9.9.9) -> intermediate proxy (8.8.8.8) -> our trusted proxy
        // (10.0.0.1). Only 10.0.0.1 is trusted, so the rightmost non-trusted hop (8.8.8.8) is the
        // one to key on — not the leftmost, fully client-controlled 9.9.9.9.
        ReflectionTestUtils.setField(filter, "trustedProxies", Set.of("10.0.0.1"));
        FilterChain chain = mock(FilterChain.class);

        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
            request.setRemoteAddr("10.0.0.1");
            request.addHeader("X-Forwarded-For", "9.9.9.9, 8.8.8.8");
            filter.doFilterInternal(request, new MockHttpServletResponse(), chain);
        }

        MockHttpServletRequest blockedRequest = new MockHttpServletRequest("POST", "/api/auth/login");
        blockedRequest.setRemoteAddr("10.0.0.1");
        blockedRequest.addHeader("X-Forwarded-For", "9.9.9.9, 8.8.8.8");
        MockHttpServletResponse blockedResponse = new MockHttpServletResponse();
        filter.doFilterInternal(blockedRequest, blockedResponse, chain);
        assertEquals(429, blockedResponse.getStatus());

        // A different claimed original client (leftmost) behind the SAME intermediate proxy
        // (8.8.8.8) is still keyed on 8.8.8.8, so it's also blocked — proving the leftmost entry
        // isn't what's actually used.
        MockHttpServletRequest differentClaimedClient = new MockHttpServletRequest("POST", "/api/auth/login");
        differentClaimedClient.setRemoteAddr("10.0.0.1");
        differentClaimedClient.addHeader("X-Forwarded-For", "1.2.3.4, 8.8.8.8");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilterInternal(differentClaimedClient, response, chain);
        assertEquals(429, response.getStatus());
    }
}
