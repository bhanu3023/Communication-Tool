package com.cloudfuze.trainer.dto.manager;

import com.cloudfuze.trainer.dto.dashboard.DashboardDtos;

import java.util.List;

public final class ManagerDtos {

    private ManagerDtos() {
    }

    /** One row in the manager's team table — latest score + attempts per section. */
    public record TeamRow(
            Long employeeId,
            String name,
            String email,
            String department,
            String team,
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

    public record EmployeeDetail(
            Long employeeId,
            String name,
            String email,
            String employeeCode,
            String department,
            String team,
            String manager,
            List<DashboardDtos.SectionCard> sections,
            List<WarningRow> warnings,
            DashboardDtos.AiFeedback aiFeedback,
            List<String> recommendations) {
    }
}
