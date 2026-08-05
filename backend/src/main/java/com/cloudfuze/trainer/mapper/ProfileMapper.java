package com.cloudfuze.trainer.mapper;

import com.cloudfuze.trainer.domain.Role;
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
        boolean admin = adminRegistry.isAdmin(user);
        // Bootstrap admins may still hold MANAGER in the DB briefly — show ADMIN in the profile.
        String role = admin ? Role.ADMIN.name() : user.getRole().name();
        return new ProfileDto(
                user.getId(),
                user.getEmployeeId(),
                user.getName(),
                user.getEmail(),
                role,
                user.getDepartment() != null ? user.getDepartment().getName() : null,
                user.getTeam() != null ? user.getTeam().getName() : null,
                user.getManager() != null ? user.getManager().getName() : null,
                admin);
    }
}
