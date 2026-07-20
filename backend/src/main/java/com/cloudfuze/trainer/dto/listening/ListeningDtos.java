package com.cloudfuze.trainer.dto.listening;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public final class ListeningDtos {

    private ListeningDtos() {
    }

    /** A comprehension question shown after the story audio (no correct answer). */
    public record QuestionView(
            Long id, int index, String questionText,
            String optionA, String optionB, String optionC, String optionD) {
    }

    /**
     * The story to play once, plus its comprehension questions. The client plays
     * {@code storyScript} via speech synthesis, showing a countdown of
     * {@code audioSeconds} (an estimate of the narration length) while it plays, then
     * starts {@code answeringSeconds} once the audio finishes.
     */
    public record StartResponse(
            Long sessionId, int attemptNumber,
            String storyTitle, String storyScript,
            int audioSeconds, int answeringSeconds,
            List<QuestionView> questions) {
    }

    public record AnswerSubmission(@NotNull Long questionId, String selectedOption) {
    }

    public record SubmitRequest(@NotNull Long sessionId, @NotNull List<AnswerSubmission> answers) {
    }

    /** Per-question outcome persisted in the section details. */
    public record AnswerResult(
            Long questionId, String questionText, String selectedOption,
            String correctOption, boolean correct) {
    }
}
