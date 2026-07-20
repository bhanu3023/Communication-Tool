package com.cloudfuze.trainer.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

/**
 * The recorded WAV audio of one spoken sentence, kept so the candidate (and their
 * manager) can replay what was said when reviewing an attempt's feedback later.
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

    /** Raw WAV bytes stored as Postgres bytea (simpler/safer than large-object oid). */
    @Column(name = "audio", nullable = false, columnDefinition = "bytea")
    private byte[] audio;
}
