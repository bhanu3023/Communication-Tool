package com.cloudfuze.trainer.security;

import com.cloudfuze.trainer.domain.Role;
import com.cloudfuze.trainer.entity.User;
import com.cloudfuze.trainer.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Promotes configured bootstrap emails to {@link Role#ADMIN} in the database. */
@Service
public class BootstrapAdminService {

    private final UserRepository userRepository;
    private final AdminRegistry adminRegistry;

    public BootstrapAdminService(UserRepository userRepository, AdminRegistry adminRegistry) {
        this.userRepository = userRepository;
        this.adminRegistry = adminRegistry;
    }

    @Transactional
    public User ensureAdmin(User user) {
        return ensureAdmin(user, null);
    }

    @Transactional
    public User ensureAdmin(User user, String loginEmail) {
        if (user == null) {
            return null;
        }
        boolean root = adminRegistry.isRootAdmin(user.getEmail())
                || adminRegistry.isRootAdmin(loginEmail);
        if (root && user.getRole() != Role.ADMIN) {
            user.setRole(Role.ADMIN);
            user.setManager(null);
            return userRepository.save(user);
        }
        return user;
    }
}
