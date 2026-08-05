package com.cloudfuze.trainer.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/** Validates the application JWT on each request and populates the SecurityContext. */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final EffectiveRoleResolver effectiveRoleResolver;

    public JwtAuthenticationFilter(JwtService jwtService, EffectiveRoleResolver effectiveRoleResolver) {
        this.jwtService = jwtService;
        this.effectiveRoleResolver = effectiveRoleResolver;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (StringUtils.hasText(header) && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                AppPrincipal parsed = jwtService.parse(token);
                var role = effectiveRoleResolver.resolve(parsed);
                AppPrincipal principal = new AppPrincipal(
                        parsed.userId(), parsed.email(), parsed.name(), role);
                var authority = new SimpleGrantedAuthority("ROLE_" + role.name());
                var auth = new UsernamePasswordAuthenticationToken(principal, null, List.of(authority));
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception ignored) {
                // Invalid token -> leave context empty; downstream returns 401.
                SecurityContextHolder.clearContext();
            }
        }
        filterChain.doFilter(request, response);
    }
}
