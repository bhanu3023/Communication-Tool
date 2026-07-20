package com.cloudfuze.trainer.dto.dashboard;

import java.util.List;

public final class DashboardDtos {

    private DashboardDtos() {
    }

    /** One section's card: its own attempts, latest/best score, and improvement. */
    public record SectionCard(
            String section,
            String status,          // "Not Started" | "Completed"
            Double latestScore,
            Double bestScore,
            Double improvement,     // latest minus previous attempt; null if fewer than 2 attempts
            int attemptsUsed,
            int attemptsAllowed,
            boolean canStart,
            boolean exhausted,
            boolean requestPending) {
    }

    /** A single section score over attempts, for a trend chart. */
    public record ProgressPoint(String label, Double score) {
    }

    public record HistoryItem(String date, String section, int attemptNumber, Double score, Double improvement) {
    }

    public record AiFeedback(List<String> strengths, List<String> weaknesses, List<String> suggestions) {
    }

    public record EmployeeDashboard(
            String name,
            List<SectionCard> cards,
            List<HistoryItem> history,
            AiFeedback aiFeedback) {
    }
}
