package com.cloudfuze.trainer.service.ai;

import java.util.List;

/** Weighted breakdown for one spoken sentence. Overall is 0-100. */
public record SpeakingEvaluation(
        double pronunciation,
        double accuracy,
        double fluency,
        double grammar,
        double vocabulary,
        double confidence,
        double overall,
        List<String> suggestions
) {
}
