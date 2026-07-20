package com.cloudfuze.trainer.entity;

import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.domain.SessionStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;

/**
 * One attempt of ONE section (Listening, Speaking, or Writing). Each section is
 * attempted independently and has its own attempts, so a session belongs to a
 * single section. There is no combined/overall score.
 */
@Getter
@Setter
@Entity
@Table(name = "assessment_session")
public class AssessmentSession extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;

    /** Which section this attempt is for. */
    @Enumerated(EnumType.STRING)
    private Section section;

    /** Attempt number within this section (1-based). */
    @Column(nullable = false)
    private int attemptNumber;

    /** For SPEAKING attempts: which fixed set (1..50) of sentences was served this attempt. */
    @Column(name = "speaking_set_number")
    private Integer speakingSetNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SessionStatus status = SessionStatus.IN_PROGRESS;

    private Instant startedAt;
    private Instant completedAt;

    /** The score for this section attempt (0-100). */
    private Double score;

    // Legacy per-section columns kept for backward compatibility; no longer written.
    private Double listeningScore;
    private Double speakingScore;
    private Double writingScore;
    private Double overallScore;
    private String weakArea;

    /** Number of proctoring warnings (tab switch, focus loss, fullscreen exit) during this attempt. */
    @Column(nullable = false)
    @ColumnDefault("0")
    private int proctorWarnings = 0;
}
