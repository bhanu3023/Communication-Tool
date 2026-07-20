package com.cloudfuze.trainer.controller;

import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.dto.AttemptDetail;
import com.cloudfuze.trainer.dto.dashboard.DashboardDtos;
import com.cloudfuze.trainer.security.CurrentUser;
import com.cloudfuze.trainer.service.AttemptDetailService;
import com.cloudfuze.trainer.service.AttemptService;
import com.cloudfuze.trainer.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/employee")
@Tag(name = "Employee", description = "Employee dashboard and history")
public class EmployeeController {

    private final DashboardService dashboardService;
    private final AttemptDetailService attemptDetailService;
    private final AttemptService attemptService;
    private final CurrentUser currentUser;

    public EmployeeController(DashboardService dashboardService, AttemptDetailService attemptDetailService,
                             AttemptService attemptService, CurrentUser currentUser) {
        this.dashboardService = dashboardService;
        this.attemptDetailService = attemptDetailService;
        this.attemptService = attemptService;
        this.currentUser = currentUser;
    }

    @Operation(summary = "Get the current employee's dashboard")
    @GetMapping("/dashboard")
    public DashboardDtos.EmployeeDashboard dashboard() {
        return dashboardService.employeeDashboard(currentUser.user());
    }

    @Operation(summary = "Get the current employee's assessment history")
    @GetMapping("/history")
    public List<DashboardDtos.HistoryItem> history() {
        return dashboardService.employeeDashboard(currentUser.user()).history();
    }

    @Operation(summary = "Per-section attempt cards (attempts used/allowed, latest score, improvement)")
    @GetMapping("/sections")
    public List<DashboardDtos.SectionCard> sections() {
        return dashboardService.sectionCards(currentUser.user());
    }

    @Operation(summary = "Every completed attempt with full per-section feedback")
    @GetMapping("/attempts")
    public List<AttemptDetail> attempts() {
        return attemptDetailService.attemptsFor(currentUser.user().getId());
    }

    @Operation(summary = "Request another attempt for a section after using all of them")
    @PostMapping("/request-attempt")
    public DashboardDtos.SectionCard requestAttempt(@RequestParam Section section) {
        return attemptService.requestAnother(currentUser.user(), section);
    }
}
