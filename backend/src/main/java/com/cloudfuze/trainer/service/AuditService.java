package com.cloudfuze.trainer.service;

import com.cloudfuze.trainer.entity.AuditLog;
import com.cloudfuze.trainer.repository.AuditLogRepository;
import org.springframework.stereotype.Service;

@Service
public class AuditService {

    private final AuditLogRepository repository;

    public AuditService(AuditLogRepository repository) {
        this.repository = repository;
    }

    public void log(String actorEmail, String action, String detail) {
        AuditLog entry = new AuditLog();
        entry.setActorEmail(actorEmail);
        entry.setAction(action);
        entry.setDetail(detail);
        repository.save(entry);
    }
}
