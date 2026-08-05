package com.cloudfuze.trainer.controller;

import com.cloudfuze.trainer.security.CurrentUser;
import com.cloudfuze.trainer.security.JwtService;
import com.cloudfuze.trainer.service.ListeningService;
import com.cloudfuze.trainer.support.WebMvcSecurityTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ListeningController.class)
class ListeningControllerTest extends WebMvcSecurityTestBase {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ListeningService listeningService;

    @MockBean
    private CurrentUser currentUser;

    @MockBean
    private JwtService jwtService;

    @Test
    void start_unauthenticated_returns401() throws Exception {
        mockMvc.perform(post("/api/listening/start"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void start_wrongRoleOnManagerPath_returns403() throws Exception {
        mockMvc.perform(post("/api/manager/team"))
                .andExpect(status().isForbidden());
    }
}
