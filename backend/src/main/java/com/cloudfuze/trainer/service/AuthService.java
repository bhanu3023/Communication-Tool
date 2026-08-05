package com.cloudfuze.trainer.service;

import com.cloudfuze.trainer.domain.Role;
import com.cloudfuze.trainer.dto.ProfileDto;
import com.cloudfuze.trainer.dto.auth.AuthDtos;
import com.cloudfuze.trainer.entity.User;
import com.cloudfuze.trainer.mapper.ProfileMapper;
import com.cloudfuze.trainer.repository.TeamRepository;
import com.cloudfuze.trainer.repository.UserRepository;
import com.cloudfuze.trainer.security.AdminRegistry;
import com.cloudfuze.trainer.security.AzureTokenVerifier;
import com.cloudfuze.trainer.security.BootstrapAdminService;
import com.cloudfuze.trainer.security.JwtService;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Handles Microsoft login: verifies the Azure AD ID token, provisions/updates the
 * user, and issues the application JWT.
 */
@Service
public class AuthService {

    private final AzureTokenVerifier azureTokenVerifier;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final ProfileMapper profileMapper;
    private final AuditService auditService;
    private final TeamRepository teamRepository;
    private final AdminRegistry adminRegistry;
    private final BootstrapAdminService bootstrapAdminService;

    public AuthService(AzureTokenVerifier azureTokenVerifier, JwtService jwtService,
                       UserRepository userRepository, ProfileMapper profileMapper, AuditService auditService,
                       TeamRepository teamRepository, AdminRegistry adminRegistry,
                       BootstrapAdminService bootstrapAdminService) {
        this.azureTokenVerifier = azureTokenVerifier;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.profileMapper = profileMapper;
        this.auditService = auditService;
        this.teamRepository = teamRepository;
        this.adminRegistry = adminRegistry;
        this.bootstrapAdminService = bootstrapAdminService;
    }

    @Transactional
    public AuthDtos.LoginResponse login(String idToken) {
        Jwt jwt = azureTokenVerifier.verify(idToken);

        String oid = firstNonBlank(jwt.getClaimAsString("oid"), jwt.getSubject());
        String email = normalizeEmail(firstNonBlank(jwt.getClaimAsString("preferred_username"),
                jwt.getClaimAsString("email"), jwt.getClaimAsString("upn")));
        String name = firstNonBlank(jwt.getClaimAsString("name"), email);

        User user = resolveUser(oid, email);
        // Provision on first login; keep seeded org data (department/team/role/manager) intact.
        if (user == null) {
            User u = new User();
            u.setRole(adminRegistry.isRootAdmin(email) ? Role.ADMIN : Role.EMPLOYEE);
            u.setEmployeeId("CF-" + Math.abs((oid == null ? email : oid).hashCode() % 100000));
            // New sign-ins default to the Migration team. PIP/Test members are pre-seeded
            // (data.sql) and take the resolveUser branch above, so they keep their team.
            teamRepository.findByName("Migration").ifPresent(t -> {
                u.setTeam(t);
                u.setDepartment(t.getDepartment());
            });
            user = u;
        }
        user.setAzureOid(oid);
        user.setEmail(email);
        user.setName(name);
        user = bootstrapAdminService.ensureAdmin(user, email);
        user = userRepository.save(user);

        auditService.log(email, "LOGIN", "Microsoft login successful");

        ProfileDto profile = profileMapper.toDto(user);
        String appToken = jwtService.issue(user);
        return new AuthDtos.LoginResponse(appToken, profile);
    }

    private User resolveUser(String oid, String email) {
        // Bootstrap admins: always match the canonical row by email so promotion is reliable.
        if (email != null && adminRegistry.isRootAdmin(email)) {
            var byEmail = userRepository.findByEmailIgnoreCase(email);
            if (byEmail.isPresent()) {
                User u = byEmail.get();
                if (oid != null) {
                    u.setAzureOid(oid);
                }
                return u;
            }
        }
        return userRepository.findByAzureOid(oid)
                .or(() -> email == null ? java.util.Optional.empty() : userRepository.findByEmailIgnoreCase(email))
                .orElse(null);
    }

    private static String normalizeEmail(String email) {
        return email == null ? null : email.trim();
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (StringUtils.hasText(v)) return v;
        }
        return null;
    }
}
