package com.cloudfuze.trainer.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** A single proctoring warning (with its reason) raised during an assessment attempt. */
@Getter
@Setter
@Entity
@Table(name = "proctor_event")
public class ProctorEvent extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private AssessmentSession session;

    @Column(columnDefinition = "text", nullable = false)
    private String reason;
}
