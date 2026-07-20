package com.cloudfuze.trainer.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "department")
public class Department extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String name;
}
