package com.cloudfuze.trainer.security;

import com.cloudfuze.trainer.domain.Role;
import com.cloudfuze.trainer.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

/** Issues and parses the application JWT returned after Microsoft login. */
@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMinutes;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expiration-minutes}") long expirationMinutes) {
        // Fail fast if the app was started without a real JWT secret. A missing, short,
        // or left-at-default secret lets anyone forge an admin/manager token, so we
        // refuse to boot rather than run insecurely.
        if (secret == null || secret.strip().length() < 32 || secret.contains("change-me")) {
            throw new IllegalStateException(
                    "APP_JWT_SECRET is missing, too short, or still the default. Set a random "
                            + "value of at least 32 characters before starting the application.");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMinutes = expirationMinutes;
    }

    public String issue(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getEmail())
                .claim("uid", user.getId())
                .claim("name", user.getName())
                .claim("role", user.getRole().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expirationMinutes, ChronoUnit.MINUTES)))
                .signWith(key)
                .compact();
    }

    public AppPrincipal parse(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return new AppPrincipal(
                claims.get("uid", Long.class),
                claims.getSubject(),
                claims.get("name", String.class),
                Role.valueOf(claims.get("role", String.class)));
    }
}
