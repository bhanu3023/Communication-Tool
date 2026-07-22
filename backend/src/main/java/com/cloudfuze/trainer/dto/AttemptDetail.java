package com.cloudfuze.trainer.dto;

/**
 * One section attempt with its score, feedback details, and improvement versus the
 * previous attempt of the same section. Each assessment session is a single section.
 */
public record AttemptDetail(
        Long sessionId,
        String section,
        int attemptNumber,
        String date,
        Double score,
        Double improvement,   // score minus the previous attempt of this section; null if first attempt
        java.util.List<String> improvedAreas, // sub-areas that rose vs the previous attempt (e.g. "Fluency (+12)")
        java.util.List<String> declinedAreas, // sub-areas that dropped vs the previous attempt (e.g. "Fluency (-12)")
        int proctorWarnings,
        String status,
        Object details
) {
}
