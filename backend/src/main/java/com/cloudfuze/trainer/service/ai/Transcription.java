package com.cloudfuze.trainer.service.ai;

/**
 * Outcome of transcribing one recording.
 *
 * <p>The distinction matters for fairness in both directions. When transcription is unavailable
 * for a reason on OUR side — no key, rate limit, timeout, a 5xx — a candidate must not be
 * penalised, so scoring falls back to the transcript their browser sent. When the audio itself
 * is unusable, it must NOT fall back: that path scores the client-supplied transcript, which is
 * whatever the caller chose to send, so junk audio plus a perfect transcript would otherwise be
 * a way to score full marks without speaking.
 */
public record Transcription(String text, Status status) {

    public enum Status {
        /** The audio was transcribed. {@code text} may still be empty if nothing was said. */
        OK,
        /** OpenAI rejected the audio itself (400). Treat as nothing spoken — never fall back. */
        UNUSABLE_AUDIO,
        /** Transcription could not run for a reason outside the candidate's control. */
        UNAVAILABLE
    }

    public static Transcription ok(String text) {
        return new Transcription(text == null ? "" : text.trim(), Status.OK);
    }

    public static Transcription unusableAudio() {
        return new Transcription("", Status.UNUSABLE_AUDIO);
    }

    public static Transcription unavailable() {
        return new Transcription("", Status.UNAVAILABLE);
    }

    /** True when the recording was assessed — whether or not any words came back. */
    public boolean assessed() {
        return status == Status.OK || status == Status.UNUSABLE_AUDIO;
    }

    public boolean hasText() {
        return text != null && !text.isBlank();
    }
}
