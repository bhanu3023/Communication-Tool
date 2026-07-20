package com.cloudfuze.trainer.security;

import com.cloudfuze.trainer.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Verifies a Microsoft Azure AD ID token against the tenant's JWKS endpoint and
 * validates that the audience matches this application's client id.
 */
@Component
public class AzureTokenVerifier {

    private final String tenantId;
    private final String clientId;
    private volatile JwtDecoder decoder;

    public AzureTokenVerifier(@Value("${app.azure.tenant-id:}") String tenantId,
                              @Value("${app.azure.client-id:}") String clientId) {
        this.tenantId = tenantId;
        this.clientId = clientId;
    }

    public Jwt verify(String idToken) {
        try {
            return decoder().decode(idToken);
        } catch (JwtException e) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid Microsoft token: " + e.getMessage());
        }
    }

    private JwtDecoder decoder() {
        JwtDecoder local = this.decoder;
        if (local != null) {
            return local;
        }
        synchronized (this) {
            if (this.decoder == null) {
                if (!StringUtils.hasText(tenantId)) {
                    throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                            "AZURE_TENANT_ID is not configured; Microsoft login is unavailable.");
                }
                String issuer = "https://login.microsoftonline.com/" + tenantId + "/v2.0";
                String jwkSetUri = "https://login.microsoftonline.com/" + tenantId + "/discovery/v2.0/keys";
                NimbusJwtDecoder nimbus = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();

                // Keep the default validators (signature, expiry, not-before) AND add
                // issuer + audience checks. setJwtValidator replaces defaults, so we
                // rebuild the full chain here.
                var validators = new java.util.ArrayList<
                        org.springframework.security.oauth2.core.OAuth2TokenValidator<
                                org.springframework.security.oauth2.jwt.Jwt>>();
                validators.add(org.springframework.security.oauth2.jwt.JwtValidators.createDefaultWithIssuer(issuer));
                if (StringUtils.hasText(clientId)) {
                    validators.add(token -> token.getAudience() != null && token.getAudience().contains(clientId)
                            ? org.springframework.security.oauth2.core.OAuth2TokenValidatorResult.success()
                            : org.springframework.security.oauth2.core.OAuth2TokenValidatorResult.failure(
                                    new org.springframework.security.oauth2.core.OAuth2Error(
                                            "invalid_audience", "Token audience does not match client id", null)));
                }
                nimbus.setJwtValidator(
                        new org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator<>(validators));
                this.decoder = nimbus;
            }
            return this.decoder;
        }
    }
}
