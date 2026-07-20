package com.cloudfuze.trainer.entity;

import com.cloudfuze.trainer.domain.Section;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

/**
 * Per-user, per-section attempt control: how many extra attempts a manager has
 * granted for this section, and whether the employee has a pending request for
 * more. Base attempts are fixed (see {@code AttemptPolicy}); this only tracks
 * the deltas.
 */
@Getter
@Setter
@Entity
@Table(name = "section_attempt_control",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "section"}))
public class SectionAttemptControl extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Section section;

    @Column(nullable = false)
    @ColumnDefault("0")
    private int extraGranted = 0;

    @Column(nullable = false)
    @ColumnDefault("false")
    private boolean requestPending = false;
}
