package com.cloudfuze.trainer.repository;

import com.cloudfuze.trainer.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
}
