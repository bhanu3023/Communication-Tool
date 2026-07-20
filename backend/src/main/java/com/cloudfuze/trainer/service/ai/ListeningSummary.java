package com.cloudfuze.trainer.service.ai;

import java.util.List;

/** AI summary of a listening attempt. */
public record ListeningSummary(
        double attention,
        double accuracy,
        double consistency,
        List<String> strengths,
        List<String> weaknesses,
        List<String> suggestions
) {
}
