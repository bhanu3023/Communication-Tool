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
        String manager
) {
}
