package com.cloudfuze.trainer.repository;

import com.cloudfuze.trainer.entity.ManagerComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ManagerCommentRepository extends JpaRepository<ManagerComment, Long> {
    List<ManagerComment> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);
}
