package com.cloudfuze.trainer.service;

import com.cloudfuze.trainer.domain.Role;
import com.cloudfuze.trainer.dto.ProfileDto;
import com.cloudfuze.trainer.dto.auth.AuthDtos;
import com.cloudfuze.trainer.entity.User;
import com.cloudfuze.trainer.mapper.ProfileMapper;
import com.cloudfuze.trainer.repository.UserRepository;
import com.cloudfuze.trainer.security.AzureTokenVerifier;
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

    public AuthService(AzureTokenVerifier azureTokenVerifier, JwtService jwtService,
                       UserRepository userRepository, ProfileMapper profileMapper, AuditService auditService) {
        this.azureTokenVerifier = azureTokenVerifier;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.profileMapper = profileMapper;
        this.auditService = auditService;
    }

    @Transactional
    public AuthDtos.LoginResponse login(String idToken) {
        Jwt jwt = azureTokenVerifier.verify(idToken);

        String oid = firstNonBlank(jwt.getClaimAsString("oid"), jwt.getSubject());
        String email = firstNonBlank(jwt.getClaimAsString("preferred_username"),
                jwt.getClaimAsString("email"), jwt.getClaimAsString("upn"));
        String name = firstNonBlank(jwt.getClaimAsString("name"), email);

        User user = resolveUser(oid, email);
        // Provision on first login; keep seeded org data (department/team/role/manager) intact.
        if (user == null) {
            user = new User();
            user.setRole(Role.EMPLOYEE);
            user.setEmployeeId("CF-" + Math.abs((oid == null ? email : oid).hashCode() % 100000));
        }
        user.setAzureOid(oid);
        user.setEmail(email);
        user.setName(name);
        user = userRepository.save(user);

        auditService.log(email, "LOGIN", "Microsoft login successful");

        ProfileDto profile = profileMapper.toDto(user);
        String appToken = jwtService.issue(user);
        return new AuthDtos.LoginResponse(appToken, profile);
    }

    private User resolveUser(String oid, String email) {
        return userRepository.findByAzureOid(oid)
                .or(() -> email == null ? java.util.Optional.empty() : userRepository.findByEmailIgnoreCase(email))
                .orElse(null);
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (StringUtils.hasText(v)) return v;
        }
        return null;
    }
}
