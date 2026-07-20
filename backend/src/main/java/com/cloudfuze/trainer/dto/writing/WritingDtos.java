package com.cloudfuze.trainer.dto.writing;

import com.cloudfuze.trainer.service.ai.WritingEvaluation;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public final class WritingDtos {

    private WritingDtos() {
    }

    public record PromptView(Long id, int index, String category, String prompt, int minWords,
                             List<String> outline) {
    }

    public record StartResponse(Long sessionId, int attemptNumber, int thinkingSeconds, int overallSeconds,
                                int questionSeconds, List<PromptView> prompts) {
    }

    public record SaveDraftRequest(@NotNull Long sessionId, @NotNull Long promptId, String content) {
    }

    /** Answer plus client-side typing telemetry used for integrity checks. */
    public record AnswerInput(
            @NotNull Long promptId,
            String content,
            int keystrokes,
            int backspaces,
            double typingSeconds) {
    }

    public record SubmitRequest(@NotNull Long sessionId, @NotNull List<AnswerInput> answers) {
    }

    /** How the answer was produced — used to judge whether it was genuinely typed. */
    public record WritingIntegrity(
            int keystrokes,
            int backspaces,
            double typingSeconds,
            int contentChars,
            double typedRatio,
            double typingWpm,
            double aiLikelihood,
            String verdict) {
    }

    /** Per-prompt outcome persisted in the section details. */
    public record WritingItem(
            String category, String prompt, String content,
            WritingEvaluation evaluation, WritingIntegrity integrity) {
    }
}
