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

/** A professional workplace sentence the employee must repeat aloud. */
@Getter
@Setter
@Entity
@Table(name = "speaking_sentence")
public class SpeakingSentence extends BaseEntity {

    @Column(columnDefinition = "text", nullable = false)
    private String text;

    /**
     * Which fixed set (1..50) this sentence belongs to. Each set holds exactly 10
     * sentences and no sentence appears in more than one set, so every user assigned
     * a distinct set sees a completely distinct group of questions.
     */
    @Column(name = "set_number", nullable = false)
    @ColumnDefault("1")
    private int setNumber = 1;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @ColumnDefault("'MEDIUM'")
    private Difficulty difficulty = Difficulty.MEDIUM;
}
