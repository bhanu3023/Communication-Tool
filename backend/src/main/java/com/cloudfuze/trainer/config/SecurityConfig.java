package com.cloudfuze.trainer.config;

import com.cloudfuze.trainer.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity      // enables @PreAuthorize for role-based access
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final String allowedOrigins;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                          @Value("${app.cors.allowed-origins}") String allowedOrigins) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.allowedOrigins = allowedOrigins;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // Stateless JWT API: CSRF tokens are not applicable (no cookies/session).
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/auth/login",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/actuator/health")
                        .permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // ADMIN is a superset of MANAGER (see Role): the JWT filter grants only
                        // ROLE_<role>, so an admin carries ROLE_ADMIN alone and a MANAGER-only
                        // rule here would lock admins out of the whole manager portal.
                        .requestMatchers("/api/manager/**").hasAnyRole("MANAGER", "ADMIN")
                        .anyRequest().authenticated())
                // Return 401 when authentication is missing/expired/invalid, so the frontend's
                // 401 interceptor clears the dead session and redirects to login; and 403 when
                // the token is valid but the role is wrong, so the SPA can show a forbidden
                // state instead of logging a signed-in user out.
                //
                // These write the response DIRECTLY rather than calling sendError. sendError asks
                // the container to run an ERROR dispatch to /error, and that dispatch re-enters
                // this filter chain with an EMPTY SecurityContext (the API is stateless, so
                // nothing restores it). /error then fails `anyRequest().authenticated()`, the
                // entry point fires, and its 401 REPLACES the 403 that was already chosen —
                // which is exactly why every wrong-role request used to answer 401.
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) ->
                                writeError(response, HttpServletResponse.SC_UNAUTHORIZED,
                                        "Unauthorized", "Authentication is required", request.getRequestURI()))
                        .accessDeniedHandler((request, response, deniedException) ->
                                writeError(response, HttpServletResponse.SC_FORBIDDEN,
                                        "Forbidden", "You do not have access to this resource",
                                        request.getRequestURI())))
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    /**
     * Writes a security error using the same {@code ErrorResponse} envelope the rest of the API
     * returns (timestamp, status, error, message, path), so the SPA parses one shape everywhere.
     * These two cases previously answered with an empty body.
     *
     * Hand-built JSON keeps this free of an ObjectMapper dependency in the security layer; the
     * only interpolated value is the request path, which is escaped below.
     */
    private static void writeError(HttpServletResponse response, int status, String error,
                                  String message, String path) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write(String.format(
                "{\"timestamp\":\"%s\",\"status\":%d,\"error\":\"%s\",\"message\":\"%s\",\"path\":\"%s\"}",
                Instant.now(), status, error, message, escape(path)));
    }

    /** Minimal JSON string escaping for the echoed request path. */
    private static String escape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "").replace("\r", "");
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(allowedOrigins.split(",")).map(String::trim).toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
