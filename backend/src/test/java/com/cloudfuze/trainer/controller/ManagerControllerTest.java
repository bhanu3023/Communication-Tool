package com.cloudfuze.trainer.controller;

import com.cloudfuze.trainer.security.CurrentUser;
import com.cloudfuze.trainer.security.JwtService;
import com.cloudfuze.trainer.service.AttemptDetailService;
import com.cloudfuze.trainer.service.AttemptService;
import com.cloudfuze.trainer.service.ManagerService;
import com.cloudfuze.trainer.service.PdfService;
import com.cloudfuze.trainer.support.WebMvcSecurityTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ManagerController.class)
class ManagerControllerTest extends WebMvcSecurityTestBase {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ManagerService managerService;

    @MockBean
    private AttemptDetailService attemptDetailService;

    @MockBean
    private PdfService pdfService;

    @MockBean
    private AttemptService attemptService;

    @MockBean
    private CurrentUser currentUser;

    @MockBean
    private JwtService jwtService;

    @Test
    void team_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/manager/team"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void team_wrongRole_returns403() throws Exception {
        mockMvc.perform(get("/api/manager/team"))
                .andExpect(status().isForbidden());
    }
}
