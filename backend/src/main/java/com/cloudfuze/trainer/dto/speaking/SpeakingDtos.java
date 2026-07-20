package com.cloudfuze.trainer.dto.speaking;

import com.cloudfuze.trainer.service.ai.SpeakingEvaluation;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public final class SpeakingDtos {

    private SpeakingDtos() {
    }

    public record SentenceView(Long id, int index, String text) {
    }

    public record StartResponse(Long sessionId, int attemptNumber, int overallSeconds, int questionSeconds,
                                List<SentenceView> sentences) {
    }

    /**
     * One spoken result from the client: the live transcript (Web Speech) and/or
     * the recorded WAV audio (base64) for Azure pronunciation assessment.
     */
    public record SpeechResultInput(
            @NotNull Long sentenceId, String expected, String transcript, String audioBase64) {
    }

    public record SubmitRequest(@NotNull Long sessionId, @NotNull List<SpeechResultInput> results) {
    }

    /** Per-sentence outcome persisted in the section details. */
    public record SpeechItem(String expected, String transcript, SpeakingEvaluation evaluation, boolean hasAudio) {
    }
}
