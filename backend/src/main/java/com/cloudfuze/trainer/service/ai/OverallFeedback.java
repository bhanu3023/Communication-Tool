package com.cloudfuze.trainer.service.ai;

import java.util.List;

/** Consolidated AI feedback shown on the employee dashboard and manager report. */
public record OverallFeedback(
        List<String> strengths,
        List<String> weaknesses,
        List<String> suggestions
) {
}
