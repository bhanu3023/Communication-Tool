package com.cloudfuze.trainer.controller;

import com.cloudfuze.trainer.dto.ProfileDto;
import com.cloudfuze.trainer.dto.auth.AuthDtos;
import com.cloudfuze.trainer.mapper.ProfileMapper;
import com.cloudfuze.trainer.security.CurrentUser;
import com.cloudfuze.trainer.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Microsoft login and profile")
public class AuthController {

    private final AuthService authService;
    private final CurrentUser currentUser;
    private final ProfileMapper profileMapper;

    public AuthController(AuthService authService, CurrentUser currentUser, ProfileMapper profileMapper) {
        this.authService = authService;
        this.currentUser = currentUser;
        this.profileMapper = profileMapper;
    }

    @Operation(summary = "Exchange a Microsoft ID token for an application JWT")
    @PostMapping("/login")
    public AuthDtos.LoginResponse login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        return authService.login(request.idToken());
    }

    @Operation(summary = "Return the authenticated user's profile")
    @GetMapping("/profile")
    @Transactional(readOnly = true)  // keep session open while mapping lazy associations
    public ProfileDto profile() {
        return profileMapper.toDto(currentUser.user());
    }

    @Operation(summary = "Logout (client discards the JWT; stateless server has no session)")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent().build();
    }
}
