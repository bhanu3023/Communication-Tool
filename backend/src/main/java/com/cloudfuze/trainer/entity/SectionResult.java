package com.cloudfuze.trainer.entity;

import com.cloudfuze.trainer.domain.Section;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Result of one section within a session. Consolidates the per-section detail
 * tables from the spec: {@code details} holds the section-specific breakdown
 * (answers / transcript / metrics) as JSON, and {@code feedback} holds the AI
 * feedback (strengths, weaknesses, suggestions) as JSON.
 */
@Getter
@Setter
@Entity
@Table(name = "section_result")
public class SectionResult extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private AssessmentSession session;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Section section;

    @Column(nullable = false)
    private Double score;

    @Column(columnDefinition = "text")
    private String details;

    @Column(columnDefinition = "text")
    private String feedback;
}
