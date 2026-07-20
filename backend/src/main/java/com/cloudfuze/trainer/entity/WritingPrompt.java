package com.cloudfuze.trainer.entity;

import com.cloudfuze.trainer.domain.Difficulty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

/** A writing task prompt, e.g. "Professional Email", "Incident Report". */
@Getter
@Setter
@Entity
@Table(name = "writing_prompt")
public class WritingPrompt extends BaseEntity {

    @Column(nullable = false)
    private String category;

    @Column(columnDefinition = "text", nullable = false)
    private String prompt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @ColumnDefault("'MEDIUM'")
    private Difficulty difficulty = Difficulty.MEDIUM;
}
