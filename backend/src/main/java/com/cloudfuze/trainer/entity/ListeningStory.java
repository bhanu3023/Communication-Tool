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

/**
 * A ~2-minute narrative that is read aloud once (via Web Speech synthesis on the
 * client). After the audio finishes, the story's 10 comprehension questions are
 * presented. There is no replay or rewind.
 */
@Getter
@Setter
@Entity
@Table(name = "listening_story")
public class ListeningStory extends BaseEntity {

    @Column(nullable = false)
    private String title;

    /** The full narrative read aloud to the candidate. */
    @Column(columnDefinition = "text", nullable = false)
    private String script;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @ColumnDefault("'MEDIUM'")
    private Difficulty difficulty = Difficulty.MEDIUM;
}
