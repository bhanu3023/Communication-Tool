package com.cloudfuze.trainer.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

/**
 * One spoken sentence's recording, plus what it was heard to say.
 *
 * <p>The audio is stored in whatever container the browser produced (webm/opus on Chrome and
 * Edge, mp4 on Safari) rather than converted to WAV first. The conversion used to happen in the
 * browser through an AudioContext, and on some machines that decode returned zero samples, so a
 * candidate who had read the sentence aloud had their answer replaced by an empty file. The
 * transcriber accepts these containers directly, so nothing needs decoding on the way in.
 *
 * <p>{@code transcript} is filled in as soon as the take is uploaded, mid-test, so the candidate
 * sees what was actually heard while they can still re-record. Scoring reuses that text instead
 * of transcribing the same audio a second time.
 */
@Getter
@Setter
@Entity
@Table(name = "speaking_recording",
        uniqueConstraints = @UniqueConstraint(columnNames = {"session_id", "sentence_index"}))
public class SpeakingRecording extends BaseEntity {

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    /** Zero-based position of the sentence within the attempt. */
    @Column(name = "sentence_index", nullable = false)
    private int sentenceIndex;

    /** Raw recorded bytes stored as Postgres bytea (simpler/safer than large-object oid). */
    @Column(name = "audio", nullable = false, columnDefinition = "bytea")
    private byte[] audio;

    /**
     * The container the browser recorded, e.g. {@code audio/webm;codecs=opus}. Null on rows
     * written before this column existed, which were always WAV — see the playback endpoint.
     */
    @Column(name = "mime_type")
    private String mimeType;

    /**
     * What the recording was heard to say, from the server-side transcriber. Null means it has
     * not been transcribed yet; empty means it was transcribed and no words came back.
     */
    @Column(name = "transcript", columnDefinition = "text")
    private String transcript;
}
