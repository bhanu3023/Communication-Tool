package com.cloudfuze.trainer.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "manager_comment")
public class ManagerComment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User employee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User manager;

    @Column(columnDefinition = "text", nullable = false)
    private String comment;
}
