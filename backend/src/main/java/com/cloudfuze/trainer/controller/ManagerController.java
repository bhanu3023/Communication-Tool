package com.cloudfuze.trainer.controller;

import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.dto.AttemptDetail;
import com.cloudfuze.trainer.dto.manager.ManagerDtos;
import com.cloudfuze.trainer.exception.ApiException;
import com.cloudfuze.trainer.security.CurrentUser;
import com.cloudfuze.trainer.service.AttemptDetailService;
import com.cloudfuze.trainer.service.AttemptService;
import com.cloudfuze.trainer.service.ManagerService;
import com.cloudfuze.trainer.service.PdfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/manager")
@PreAuthorize("hasRole('MANAGER')")
@Tag(name = "Manager", description = "Team overview and employee reports")
public class ManagerController {

    private final ManagerService managerService;
    private final AttemptDetailService attemptDetailService;
    private final PdfService pdfService;
    private final AttemptService attemptService;
    private final CurrentUser currentUser;
    private final Set<String> superAdminEmails;

    public ManagerController(ManagerService managerService, AttemptDetailService attemptDetailService,
                             PdfService pdfService, AttemptService attemptService, CurrentUser currentUser,
                             @Value("${app.super-admin-emails:abhinav.surattu@cloudfuze.com,bhanu.srikakulam@cloudfuze.com}")
                             String superAdminEmails) {
        this.managerService = managerService;
        this.attemptDetailService = attemptDetailService;
        this.pdfService = pdfService;
        this.attemptService = attemptService;
        this.currentUser = currentUser;
        this.superAdminEmails = Arrays.stream(superAdminEmails.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());
    }

    /** Only a configured super-admin (default: Abhinav, Bhanu) may manage manager access. */
    private void requireSuperAdmin() {
        if (!superAdminEmails.contains(currentUser.user().getEmail().toLowerCase(Locale.ROOT))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only an administrator can manage manager access");
        }
    }

    @Operation(summary = "List the manager's team with optional search and filters")
    @GetMapping("/team")
    public List<ManagerDtos.TeamRow> team(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String team,
            @RequestParam(required = false) String department) {
        return managerService.team(currentUser.user(), search, team, department);
    }

    @Operation(summary = "Get the full detail for one team member")
    @GetMapping("/employee/{id}")
    public ManagerDtos.EmployeeDetail employee(@PathVariable Long id) {
        return managerService.employeeDetail(currentUser.user(), id);
    }

    @Operation(summary = "Alias of employee detail used by the report view")
    @GetMapping("/report/{id}")
    public ManagerDtos.EmployeeDetail report(@PathVariable Long id) {
        return managerService.employeeDetail(currentUser.user(), id);
    }

    @Operation(summary = "Every completed attempt for a team member, with full per-section feedback")
    @GetMapping("/employee/{id}/attempts")
    public List<AttemptDetail> employeeAttempts(@PathVariable Long id) {
        return attemptDetailService.attemptsFor(id);
    }

    @Operation(summary = "Grant one additional attempt to a team member for a section")
    @PostMapping("/employee/{id}/grant-attempt")
    public ManagerDtos.EmployeeDetail grantAttempt(@PathVariable Long id, @RequestParam Section section) {
        attemptService.grant(currentUser.user(), id, section, 1);
        return managerService.employeeDetail(currentUser.user(), id);
    }

    @Operation(summary = "List all managers (admin only)")
    @GetMapping("/access/managers")
    public List<ManagerDtos.ManagerRow> managers() {
        requireSuperAdmin();
        return managerService.managers();
    }

    @Operation(summary = "Grant manager access to a user by email (admin only)")
    @PostMapping("/access/grant")
    public List<ManagerDtos.ManagerRow> grantManager(@RequestBody ManagerDtos.GrantManagerRequest request) {
        requireSuperAdmin();
        managerService.grantManager(request.email());
        return managerService.managers();
    }

    @Operation(summary = "Download a PDF report for one team member")
    @GetMapping("/download-pdf/{id}")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable Long id) {
        ManagerDtos.EmployeeDetail detail = managerService.employeeDetail(currentUser.user(), id);
        byte[] pdf = pdfService.employeeReport(detail);
        String filename = "report-" + detail.employeeCode() + ".pdf";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(pdf);
    }
}
