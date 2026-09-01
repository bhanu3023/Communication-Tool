package com.cloudfuze.trainer.controller;

import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.dto.AttemptDetail;
import com.cloudfuze.trainer.dto.dashboard.DashboardDtos;
import com.cloudfuze.trainer.security.CurrentUser;
import com.cloudfuze.trainer.service.AttemptDetailService;
import com.cloudfuze.trainer.service.AttemptService;
import com.cloudfuze.trainer.service.ContentReadinessService;
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
    private final ContentReadinessService contentReadinessService;
    private final CurrentUser currentUser;

    public EmployeeController(DashboardService dashboardService, AttemptDetailService attemptDetailService,
                             AttemptService attemptService, ContentReadinessService contentReadinessService,
                             CurrentUser currentUser) {
        this.dashboardService = dashboardService;
        this.attemptDetailService = attemptDetailService;
        this.attemptService = attemptService;
        this.contentReadinessService = contentReadinessService;
        this.currentUser = currentUser;
    }

    @Operation(summary = "Get the current employee's dashboard for a level (1 = base, 2 = advanced). "
            + "Set ai=true only if you render the coaching summary — it costs a live OpenAI call.")
    @GetMapping("/dashboard")
    public DashboardDtos.EmployeeDashboard dashboard(
            @RequestParam(defaultValue = "1") int level,
            @RequestParam(defaultValue = "false") boolean ai) {
        return dashboardService.employeeDashboard(currentUser.user(), level, ai);
    }

    @Operation(summary = "Get the current employee's assessment history for a level")
    @GetMapping("/history")
    public List<DashboardDtos.HistoryItem> history(@RequestParam(defaultValue = "1") int level) {
        // History never shows coaching text, so this must not request it.
        return dashboardService.employeeDashboard(currentUser.user(), level, false).history();
    }

    @Operation(summary = "Per-section attempt cards for a level (attempts used/allowed, latest score, improvement)")
    @GetMapping("/sections")
    public List<DashboardDtos.SectionCard> sections(@RequestParam(defaultValue = "1") int level) {
        return dashboardService.sectionCards(currentUser.user(), level);
    }

    @Operation(summary = "Whether a level has questions seeded yet, per section. A level portal "
            + "calls this so it can say so up front, rather than letting a candidate meet an empty "
            + "bank mid-test having already spent an attempt to get there.")
    @GetMapping("/level-readiness")
    public DashboardDtos.LevelReadiness levelReadiness(@RequestParam(defaultValue = "1") int level) {
        return contentReadinessService.readiness(level);
    }

    @Operation(summary = "Completed attempts with full per-section feedback; omit level for all levels")
    @GetMapping("/attempts")
    public List<AttemptDetail> attempts(@RequestParam(required = false) Integer level) {
        return attemptDetailService.attemptsFor(currentUser.user().getId(), level);
    }

    @Operation(summary = "Request another attempt for a section at a level after using all of them")
    @PostMapping("/request-attempt")
    public DashboardDtos.SectionCard requestAttempt(@RequestParam Section section,
                                                   @RequestParam(defaultValue = "1") int level) {
        return attemptService.requestAnother(currentUser.user(), section, level);
    }
}
