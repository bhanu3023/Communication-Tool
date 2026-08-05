package com.cloudfuze.trainer.controller;

import com.cloudfuze.trainer.dto.ProfileDto;
import com.cloudfuze.trainer.entity.User;
import com.cloudfuze.trainer.mapper.ProfileMapper;
import com.cloudfuze.trainer.security.CurrentUser;
import com.cloudfuze.trainer.security.JwtService;
import com.cloudfuze.trainer.service.AuthService;
import com.cloudfuze.trainer.support.WebMvcSecurityTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
class AuthControllerTest extends WebMvcSecurityTestBase {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    @MockBean
    private CurrentUser currentUser;

    @MockBean
    private ProfileMapper profileMapper;

    @MockBean
    private JwtService jwtService;

    @Test
    void profile_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/auth/profile"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void profile_authenticated_returns200() throws Exception {
        User user = new User();
        user.setId(1L);
        when(currentUser.user()).thenReturn(user);
        when(bootstrapAdminService.ensureAdmin(user)).thenReturn(user);
        when(profileMapper.toDto(user))
                .thenReturn(new ProfileDto(1L, "E1", "User", "u@test.com", "EMPLOYEE", null, null, null, false));
        mockMvc.perform(get("/api/auth/profile"))
                .andExpect(status().isOk());
    }
}
