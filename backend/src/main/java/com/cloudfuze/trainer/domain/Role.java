package com.cloudfuze.trainer.domain;

/**
 * Application roles. Employees see only their own data; managers see their team; admins
 * additionally manage users, roles and teams on the User Access screen.
 *
 * ADMIN is a SUPERSET of MANAGER — an admin reaches every manager screen. That is why
 * {@code SecurityConfig} guards {@code /api/manager/**} with {@code hasAnyRole(MANAGER, ADMIN)}
 * and not MANAGER alone: the JWT filter grants exactly {@code ROLE_<role>}, so an admin
 * carries only ROLE_ADMIN and a MANAGER-only rule would lock them out of the very screen
 * they administer. Never narrow that rule without also granting ADMIN.
 */
public enum Role {
    EMPLOYEE,
    MANAGER,
    ADMIN
}
