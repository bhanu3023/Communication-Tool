package com.cloudfuze.trainer.dto;

/** Returned after submitting a section. */
public record SectionScoreResponse(
        String section,
        double score,
        boolean sessionCompleted,
        Double overallScore,
        Object feedback,
        Object details
) {
}
