package com.cloudfuze.trainer.controller;

import com.cloudfuze.trainer.dto.dashboard.DashboardDtos;
import com.cloudfuze.trainer.entity.User;
import com.cloudfuze.trainer.security.CurrentUser;
import com.cloudfuze.trainer.security.JwtService;
import com.cloudfuze.trainer.service.AttemptDetailService;
import com.cloudfuze.trainer.service.AttemptService;
import com.cloudfuze.trainer.service.DashboardService;
import com.cloudfuze.trainer.support.WebMvcSecurityTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(EmployeeController.class)
class EmployeeControllerTest extends WebMvcSecurityTestBase {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DashboardService dashboardService;

    @MockBean
    private AttemptDetailService attemptDetailService;

    @MockBean
    private AttemptService attemptService;

    @MockBean
    private CurrentUser currentUser;

    @MockBean
    private JwtService jwtService;

    @Test
    void dashboard_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/employee/dashboard"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void dashboard_authenticated_returns200() throws Exception {
        User user = new User();
        user.setId(1L);
        user.setName("Employee");
        when(currentUser.user()).thenReturn(user);
        when(dashboardService.employeeDashboard(any(), anyInt(), anyBoolean()))
                .thenReturn(new DashboardDtos.EmployeeDashboard(
                        "Employee", 1, true, false, List.of(), List.of(), null));

        mockMvc.perform(get("/api/employee/dashboard"))
                .andExpect(status().isOk());
    }
}
