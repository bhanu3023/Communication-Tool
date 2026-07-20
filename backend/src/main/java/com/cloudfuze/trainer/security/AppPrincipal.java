package com.cloudfuze.trainer.security;

import com.cloudfuze.trainer.domain.Role;

/** Authenticated principal derived from the application JWT. */
public record AppPrincipal(Long userId, String email, String name, Role role) {
}
