package com.cloudfuze.trainer.controller;

import com.cloudfuze.trainer.domain.Role;
import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.dto.AttemptDetail;
import com.cloudfuze.trainer.dto.manager.ManagerDtos;
import com.cloudfuze.trainer.exception.ApiException;
import com.cloudfuze.trainer.security.AdminRegistry;
import com.cloudfuze.trainer.security.CurrentUser;
import com.cloudfuze.trainer.service.AttemptDetailService;
import com.cloudfuze.trainer.service.AttemptService;
import com.cloudfuze.trainer.service.ManagerService;
import com.cloudfuze.trainer.service.PdfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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
// ADMIN is a superset of MANAGER, so it must be listed here as well as in SecurityConfig —
// this method-security rule is a SECOND gate, and leaving it MANAGER-only would 403 every
// admin on the whole controller.
@PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
@Tag(name = "Manager", description = "Team overview and employee reports")
public class ManagerController {

    private final ManagerService managerService;
    private final AttemptDetailService attemptDetailService;
    private final PdfService pdfService;
    private final AttemptService attemptService;
    private final CurrentUser currentUser;
    private final AdminRegistry adminRegistry;

    public ManagerController(ManagerService managerService, AttemptDetailService attemptDetailService,
                             PdfService pdfService, AttemptService attemptService, CurrentUser currentUser,
                             AdminRegistry adminRegistry) {
        this.managerService = managerService;
        this.attemptDetailService = attemptDetailService;
        this.pdfService = pdfService;
        this.attemptService = attemptService;
        this.currentUser = currentUser;
        this.adminRegistry = adminRegistry;
    }

    /** Only an admin may use the User Access screen (add users, manage roles and teams). */
    private void requireSuperAdmin() {
        if (!adminRegistry.isAdmin(currentUser.user())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only an administrator can manage user access");
        }
    }

    @Operation(summary = "List the manager's team with optional search and filters")
    @GetMapping("/team")
    public List<ManagerDtos.TeamRow> team(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String team,
            @RequestParam(required = false) String department,
            @RequestParam(defaultValue = "1") int level) {
        return managerService.team(currentUser.user(), search, team, department, level);
    }

    @Operation(summary = "List the available team names for the Team Overview filter")
    @GetMapping("/teams")
    public List<String> teams() {
        return managerService.teamNames();
    }

    @Operation(summary = "Get the full detail for one team member")
    @GetMapping("/employee/{id}")
    public ManagerDtos.EmployeeDetail employee(@PathVariable Long id,
                                               @RequestParam(defaultValue = "1") int level) {
        return managerService.employeeDetail(currentUser.user(), id, level);
    }

    @Operation(summary = "Alias of employee detail used by the report view")
    @GetMapping("/report/{id}")
    public ManagerDtos.EmployeeDetail report(@PathVariable Long id,
                                             @RequestParam(defaultValue = "1") int level) {
        return managerService.employeeDetail(currentUser.user(), id, level);
    }

    @Operation(summary = "Every completed attempt for a team member, with full per-section feedback")
    @GetMapping("/employee/{id}/attempts")
    public List<AttemptDetail> employeeAttempts(@PathVariable Long id,
                                                @RequestParam(required = false) Integer level) {
        return attemptDetailService.attemptsFor(id, level);
    }

    @Operation(summary = "Grant one additional attempt to a team member for a section")
    @PostMapping("/employee/{id}/grant-attempt")
    public ManagerDtos.EmployeeDetail grantAttempt(@PathVariable Long id, @RequestParam Section section,
                                                   @RequestParam(defaultValue = "1") int level) {
        attemptService.grant(currentUser.user(), id, section, level, 1);
        return managerService.employeeDetail(currentUser.user(), id, level);
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

    @Operation(summary = "List every user with their role and team (admin only)")
    @GetMapping("/access/users")
    public List<ManagerDtos.UserRow> users() {
        requireSuperAdmin();
        return managerService.allUsers();
    }

    @Operation(summary = "Change an existing user's role and team (admin only)")
    @PutMapping("/access/users/{id}")
    public ManagerDtos.UserRow updateUser(@PathVariable Long id,
                                          @Valid @RequestBody ManagerDtos.UpdateUserRequest request) {
        requireSuperAdmin();
        // Same protection as the add path: a bootstrap-list admin keeps admin rights whatever
        // the database says, so we refuse to store a role that contradicts that.
        ManagerDtos.UserRow target = managerService.allUsers().stream()
                .filter(u -> u.id().equals(id))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        if (request.role() != Role.ADMIN && adminRegistry.isBootstrapAdmin(target.email())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This administrator's role cannot be changed");
        }
        return managerService.updateUser(id, request, currentUser.user().getEmail());
    }

    @Operation(summary = "Add a user with a role and team, or re-assign an existing one (admin only)")
    @PostMapping("/access/users")
    public ManagerDtos.AddedUser addUser(@Valid @RequestBody ManagerDtos.AddUserRequest request) {
        requireSuperAdmin();
        // A bootstrap-list admin keeps admin rights whatever the database says, so storing a
        // lesser role would make the row contradict their real access.
        if (request.role() != Role.ADMIN && adminRegistry.isBootstrapAdmin(request.email())) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "This administrator's role cannot be changed");
        }
        return managerService.addUser(request, currentUser.user().getEmail());
    }

    @Operation(summary = "Revoke a user's manager access (admin only)")
    @DeleteMapping("/access/managers/{id}")
    public List<ManagerDtos.ManagerRow> revokeManager(@PathVariable Long id) {
        requireSuperAdmin();
        ManagerDtos.ManagerRow target = managerService.managers().stream()
                .filter(m -> m.id().equals(id))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Manager not found"));
        // An administrator's access can never be revoked (this also blocks self-revoke,
        // since only admins reach this endpoint).
        if (adminRegistry.isBootstrapAdmin(target.email())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "An administrator's access cannot be revoked");
        }
        return managerService.revokeManager(id);
    }

    @Operation(summary = "Download a PDF report for one team member")
    @GetMapping("/download-pdf/{id}")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable Long id,
                                              @RequestParam(defaultValue = "1") int level) {
        ManagerDtos.EmployeeDetail detail = managerService.employeeDetail(currentUser.user(), id, level);
        byte[] pdf = pdfService.employeeReport(detail);
        String filename = "report-" + detail.employeeCode() + ".pdf";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(pdf);
    }
}
