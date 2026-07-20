package com.cloudfuze.trainer.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
// Explicit option column names keep the schema in sync with data.sql
// (Hibernate would otherwise map optionA -> "optiona").

/**
 * A multiple-choice comprehension question about a {@link ListeningStory}.
 * Presented only after the story's audio has finished playing.
 */
@Getter
@Setter
@Entity
@Table(name = "listening_question")
public class ListeningQuestion extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private ListeningStory story;

    /** Ordering of the question within the story (1..10). */
    @Column(nullable = false)
    private int ordinal;

    @Column(columnDefinition = "text", nullable = false)
    private String questionText;

    @Column(name = "option_a", nullable = false)
    private String optionA;
    @Column(name = "option_b", nullable = false)
    private String optionB;
    @Column(name = "option_c", nullable = false)
    private String optionC;
    @Column(name = "option_d", nullable = false)
    private String optionD;

    /** Correct option: one of A, B, C, D. */
    @Column(nullable = false, length = 1)
    private String correctOption;
}
