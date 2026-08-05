package com.cloudfuze.trainer.controller;

import com.cloudfuze.trainer.security.CurrentUser;
import com.cloudfuze.trainer.security.JwtService;
import com.cloudfuze.trainer.service.ProctorService;
import com.cloudfuze.trainer.support.WebMvcSecurityTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProctorController.class)
class ProctorControllerTest extends WebMvcSecurityTestBase {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProctorService proctorService;

    @MockBean
    private CurrentUser currentUser;

    @MockBean
    private JwtService jwtService;

    @Test
    void event_unauthenticated_returns401() throws Exception {
        mockMvc.perform(post("/api/proctor/event")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\":1,\"reason\":\"TAB_SWITCH\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void managerPath_wrongRole_returns403() throws Exception {
        mockMvc.perform(post("/api/manager/team"))
                .andExpect(status().isForbidden());
    }
}
