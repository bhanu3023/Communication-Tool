package com.cloudfuze.trainer.dto;

/** The authenticated user's profile, stored after Microsoft login. */
public record ProfileDto(
        Long id,
        String employeeId,
        String name,
        String email,
        String role,
        String department,
        String team,
        String manager,
        /**
         * Whether this user administers the app — role is ADMIN, or their email is on the
         * bootstrap list. Computed server-side by AdminRegistry so the SPA has ONE source of
         * truth; it previously hardcoded the email list in two components, which drifted.
         */
        boolean admin
) {
}
