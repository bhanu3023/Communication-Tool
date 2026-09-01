package com.cloudfuze.trainer.dto.manager;

import com.cloudfuze.trainer.domain.Role;
import com.cloudfuze.trainer.dto.dashboard.DashboardDtos;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public final class ManagerDtos {

    private ManagerDtos() {
    }

    /** One row in the manager's team table — latest score + attempts per section, at one level. */
    public record TeamRow(
            Long employeeId,
            String name,
            String email,
            String department,
            String team,
            int level,               // which level these scores belong to
            boolean level2Unlocked,  // has this employee passed all three Level 1 sections?
            boolean levelUnlocked,   // is THIS row's level open for them? (always true at Level 1)
            Double listeningScore,
            Double speakingScore,
            Double writingScore,
            int listeningAttempts,
            int speakingAttempts,
            int writingAttempts,
            boolean requestPending,
            int totalWarnings) {
    }

    /** One recorded proctoring warning, shown to the manager with its reason. */
    public record WarningRow(int attemptNumber, String section, String dateTime, String reason) {
    }

    /** A manager in the "User Access" admin screen's current-managers list. */
    public record ManagerRow(Long id, String name, String email) {
    }

    /** Request to grant manager access to a user by email. */
    public record GrantManagerRequest(String email) {
    }

    /**
     * Admin request to add a user with a role and a team — or to re-assign one who already
     * exists. The team is matched case-insensitively and created if it is new; the user's
     * department follows from that team.
     */
    public record AddUserRequest(
            @NotBlank(message = "Email is required")
            @Email(message = "Enter a valid email address")
            String email,
            /** Optional — derived from the email local-part when left blank. */
            String name,
            @NotNull(message = "Role is required")
            Role role,
            @NotBlank(message = "Team is required")
            String team) {
    }

    /**
     * The user an admin just added or re-assigned. {@code created} distinguishes a brand-new
     * account from an existing one that was moved, so the UI can say which happened.
     */
    public record AddedUser(Long id, String name, String email, String role,
                            String team, String department, boolean created) {
    }

    /**
     * One row in the User Access screen's editable user list. {@code protectedAdmin} marks a
     * bootstrap-list admin whose role the UI must not offer to change — the server rejects it.
     */
    public record UserRow(Long id, String name, String email, String employeeCode,
                          String role, String team, String department, boolean protectedAdmin) {
    }

    /**
     * Admin request to change an existing user's role and/or team.
     *
     * {@code team} is OPTIONAL: blank means "leave the team alone". Requiring it would make a
     * plain role change impossible for anyone who has no team yet (several managers do not),
     * since the UI has nothing to send.
     */
    public record UpdateUserRequest(
            @NotNull(message = "Role is required")
            Role role,
            String team) {
    }

    public record EmployeeDetail(
            Long employeeId,
            String name,
            String email,
            String employeeCode,
            String department,
            String team,
            String manager,
            int level,               // the level these sections/feedback describe
            boolean level2Unlocked,  // has this employee passed all three Level 1 sections?
            boolean level3Unlocked,  // ...and all three Level 2 sections?
            List<DashboardDtos.SectionCard> sections,
            List<WarningRow> warnings,
            DashboardDtos.AiFeedback aiFeedback,
            List<String> recommendations) {
    }
}
