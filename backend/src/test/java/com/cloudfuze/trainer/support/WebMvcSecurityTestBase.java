package com.cloudfuze.trainer.support;

import com.cloudfuze.trainer.config.SecurityConfig;
import com.cloudfuze.trainer.repository.UserRepository;
import com.cloudfuze.trainer.security.AdminRegistry;
import com.cloudfuze.trainer.security.BootstrapAdminService;
import com.cloudfuze.trainer.security.EffectiveRoleResolver;
import com.cloudfuze.trainer.security.JwtAuthenticationFilter;
import com.cloudfuze.trainer.security.JwtService;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

/**
 * Shared security slice configuration for {@code @WebMvcTest} controller auth tests.
 * Subclasses still declare their own {@code @WebMvcTest(Controller.class)} and {@code @MockBean}s.
 */
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, EffectiveRoleResolver.class})
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "app.cors.allowed-origins=http://localhost:5173",
        "app.jwt.secret=test-secret-at-least-32-characters-long-for-hs256",
        "app.jwt.expiration-minutes=60",
        "app.super-admin-emails=admin@test.com"
})
public abstract class WebMvcSecurityTestBase {

    @MockBean
    protected UserRepository userRepository;

    @MockBean
    protected AdminRegistry adminRegistry;

    @MockBean
    protected BootstrapAdminService bootstrapAdminService;

    // JwtService is mocked in each subclass so the filter never parses real tokens in slice tests.
    protected static final String JWT_MOCK_BEAN = "jwtService";
}
