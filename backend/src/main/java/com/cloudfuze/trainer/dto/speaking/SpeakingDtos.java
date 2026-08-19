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
     * One take, uploaded as soon as the candidate stops recording.
     *
     * @param sentenceIndex zero-based position within the attempt; a re-record replaces the take
     *                      already stored at that position
     * @param mimeType      the container the browser recorded, so the transcriber can pick a
     *                      decoder — webm/opus on Chrome and Edge, mp4 on Safari
     */
    public record TakeRequest(@NotNull Long sessionId, int sentenceIndex,
                              @NotNull String audioBase64, String mimeType) {
    }

    /**
     * What the recording was heard to say, shown to the candidate before they move on.
     *
     * @param text     the transcriber's words; empty when nothing was said, or when it could
     *                 not run
     * @param assessed true when the recording was actually checked — so an empty {@code text}
     *                 means silence rather than an outage
     * @param stored   whether the audio was kept; false means nothing usable arrived
     */
    public record TakeResponse(String text, boolean assessed, boolean stored) {
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

    /**
     * Per-sentence outcome persisted in the section details.
     *
     * <p>{@code transcript} is always what the RECORDING was heard to say, never what the
     * browser's live recogniser reported. That live text exists only so the candidate sees
     * something while speaking; it is unreliable and trivially forged, so it must not appear in
     * feedback. When transcription could not run, {@code transcript} is empty and
     * {@code transcriptionFailed} is true — which the UI must show as "could not be processed"
     * rather than as the candidate having said nothing.
     */
    public record SpeechItem(String expected, String transcript, SpeakingEvaluation evaluation,
                             boolean hasAudio, boolean transcriptionFailed) {
    }
}
