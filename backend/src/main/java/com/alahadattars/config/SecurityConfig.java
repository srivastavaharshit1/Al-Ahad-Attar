package com.alahadattars.config;

import com.alahadattars.security.AuthRateLimitFilter;
import com.alahadattars.security.JwtAuthenticationEntryPoint;
import com.alahadattars.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
// Without this, every @PreAuthorize in the codebase is silently ignored — the annotations look like
// protection but enforce nothing. URL rules below are the primary gate; this makes them defence in depth.
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final AuthRateLimitFilter authRateLimitFilter;
    private final UserDetailsService userDetailsService;
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    @Value("${app.swagger.public:false}")
    private boolean swaggerPublic;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configure(http))
            .exceptionHandling(exception -> exception
                .authenticationEntryPoint(jwtAuthenticationEntryPoint)
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authorizeHttpRequests(auth -> {
                auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/health").permitAll()
                // Razorpay calls this directly — it can't send our JWT. Authenticity comes from
                // the X-Razorpay-Signature check inside PaymentController/handleWebhookEvent, not
                // from Spring Security's auth layer.
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/payment/webhook").permitAll()
                .requestMatchers("/cleanup-sizes").permitAll();

                // The OpenAPI document describes every endpoint and its request shapes, so it is closed to
                // anonymous callers by default. Set app.swagger.public=true for local development only.
                String[] apiDocs = {"/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**"};
                if (swaggerPublic) {
                    auth.requestMatchers(apiDocs).permitAll();
                } else {
                    auth.requestMatchers(apiDocs).hasRole("ADMIN");
                }

                auth
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/cart/evaluate-guest").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/products/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/categories/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/variants/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/images/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/promotions/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/homepage/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/public/cms/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/settings/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/gift-services/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/reviews/product/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/reviews/images/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/reviews/*/report").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/variants/*/images").hasRole("ADMIN")
                .requestMatchers("/api/categories/**").hasRole("ADMIN")
                .requestMatchers("/api/images/**").hasRole("ADMIN")
                .requestMatchers("/api/promotions/**").hasRole("ADMIN")
                .requestMatchers("/api/admin/reviews/**").hasRole("ADMIN")
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/settings/**").hasRole("ADMIN")
                .requestMatchers("/api/products/**").hasRole("ADMIN")
                .requestMatchers("/api/variants/**").hasRole("ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/contact/submit").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/orders/all").hasRole("ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/orders/*/status").hasRole("ADMIN")
                .requestMatchers("/api/admin/contact/**").hasRole("ADMIN")
                .requestMatchers("/api/admin/promotions/**").hasRole("ADMIN")
                .requestMatchers("/api/admin/customers/**").hasRole("ADMIN")
                .requestMatchers("/api/admin/dashboard/**").hasRole("ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/orders/*/confirm").hasRole("ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/orders/*/pack").hasRole("ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/orders/*/ship").hasRole("ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/orders/*/deliver").hasRole("ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/orders/*/cancel").hasRole("ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/orders/*/refund").hasRole("ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/orders/*/shipping").hasRole("ADMIN")
                .anyRequest().authenticated();
            })
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(authRateLimitFilter, JwtAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
