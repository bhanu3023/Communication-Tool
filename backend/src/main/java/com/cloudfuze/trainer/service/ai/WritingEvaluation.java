package com.cloudfuze.trainer.service.ai;

import java.util.List;

/** Rubric breakdown for one writing answer. Overall is 0-100. */
public record WritingEvaluation(
        double grammar,
        double clarity,
        double vocabulary,
        double tone,
        double professionalism,
        double structure,
        double readability,
        double completeness,
        double spelling,
        double conciseness,
        double overall,
        List<String> mistakes,
        List<String> suggestions,
        String improvedVersion
) {
}
