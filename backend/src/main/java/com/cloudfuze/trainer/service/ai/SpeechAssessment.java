package com.cloudfuze.trainer.service.ai;

/** Result of Azure AI Speech pronunciation assessment (all scores 0-100). */
public record SpeechAssessment(
        double accuracy,
        double fluency,
        double completeness,
        double pronunciation,
        String recognizedText
) {
}
