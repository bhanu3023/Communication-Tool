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
        /**
         * Every genuine error in what was spoken, one entry each, quoted with its correction and
         * a short reason. Separate from {@link #suggestions}, which coaches the pattern behind
         * the most important one — a candidate needs both the list and the lesson. Empty for a
         * faultless answer, and empty on older attempts recorded before this field existed.
         */
        List<String> mistakes,
        List<String> suggestions
) {
}
