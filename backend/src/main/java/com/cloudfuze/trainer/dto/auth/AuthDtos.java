package com.cloudfuze.trainer.dto.auth;

import com.cloudfuze.trainer.dto.ProfileDto;
import jakarta.validation.constraints.NotBlank;

/** Authentication request/response payloads. */
public final class AuthDtos {

    private AuthDtos() {
    }

    /** The Microsoft ID token obtained by the SPA via MSAL. */
    public record LoginRequest(@NotBlank String idToken) {
    }

    public record LoginResponse(String token, ProfileDto profile) {
    }
}
