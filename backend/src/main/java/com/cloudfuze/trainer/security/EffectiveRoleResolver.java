package com.cloudfuze.trainer.security;

import com.cloudfuze.trainer.domain.Role;
import com.cloudfuze.trainer.entity.User;
import com.cloudfuze.trainer.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Resolves the role that should authorize this request. The JWT carries a snapshot from
 * login; bootstrap admins and User Access edits live in the database, so every authenticated
 * request re-reads the stored role and promotes configured bootstrap emails to ADMIN.
 */
@Service
public class EffectiveRoleResolver {

    private final UserRepository userRepository;
    private final AdminRegistry adminRegistry;
    private final BootstrapAdminService bootstrapAdminService;

    public EffectiveRoleResolver(UserRepository userRepository,
                                 AdminRegistry adminRegistry,
                                 BootstrapAdminService bootstrapAdminService) {
        this.userRepository = userRepository;
        this.adminRegistry = adminRegistry;
        this.bootstrapAdminService = bootstrapAdminService;
    }

    @Transactional
    public Role resolve(AppPrincipal jwtPrincipal) {
        User user = userRepository.findById(jwtPrincipal.userId()).orElse(null);
        if (user != null) {
            user = bootstrapAdminService.ensureAdmin(user);
            return user.getRole();
        }
        if (adminRegistry.isBootstrapAdmin(jwtPrincipal.email())) {
            return Role.ADMIN;
        }
        return jwtPrincipal.role();
    }
}
