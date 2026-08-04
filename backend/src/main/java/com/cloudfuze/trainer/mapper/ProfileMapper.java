package com.cloudfuze.trainer.mapper;

import com.cloudfuze.trainer.dto.ProfileDto;
import com.cloudfuze.trainer.entity.User;
import com.cloudfuze.trainer.security.AdminRegistry;
import org.springframework.stereotype.Component;

@Component
public class ProfileMapper {

    private final AdminRegistry adminRegistry;

    public ProfileMapper(AdminRegistry adminRegistry) {
        this.adminRegistry = adminRegistry;
    }

    public ProfileDto toDto(User user) {
        return new ProfileDto(
                user.getId(),
                user.getEmployeeId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name(),
                user.getDepartment() != null ? user.getDepartment().getName() : null,
                user.getTeam() != null ? user.getTeam().getName() : null,
                user.getManager() != null ? user.getManager().getName() : null,
                adminRegistry.isAdmin(user));
    }
}
