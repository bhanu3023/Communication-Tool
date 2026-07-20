package com.cloudfuze.trainer.entity;

import com.cloudfuze.trainer.domain.Role;
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

@Getter
@Setter
@Entity
@Table(name = "users")
public class User extends BaseEntity {

    /** Azure AD object id (oid claim) — stable per-user identifier. */
    @Column(unique = true)
    private String azureOid;

    @Column(nullable = false)
    private String employeeId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.EMPLOYEE;

    @ManyToOne(fetch = FetchType.LAZY)
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY)
    private Team team;

    /** The user's manager (self-referencing). Null for top-level managers. */
    @ManyToOne(fetch = FetchType.LAZY)
    private User manager;

    /** Extra attempts granted by a manager on top of the base allowance. */
    @Column(nullable = false)
    @ColumnDefault("0")
    private int extraAttemptsGranted = 0;

    /** Set when the employee has requested another attempt after exhausting theirs. */
    @Column(nullable = false)
    @ColumnDefault("false")
    private boolean extraAttemptRequested = false;

    /**
     * The fixed speaking set (1..50) permanently assigned to this user. Two users are
     * never given the same set until all sets are in use; assignment is least-recently-used.
     * Null until the user starts their first speaking assessment.
     */
    @Column(name = "speaking_set_number")
    private Integer speakingSetNumber;

    /** When the speaking set was assigned — drives least-recently-used selection. */
    @Column(name = "speaking_set_assigned_at")
    private java.time.Instant speakingSetAssignedAt;
}
