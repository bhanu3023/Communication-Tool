package com.cloudfuze.trainer.service;

import com.cloudfuze.trainer.entity.AssessmentSession;
import com.cloudfuze.trainer.entity.ProctorEvent;
import com.cloudfuze.trainer.entity.User;
import com.cloudfuze.trainer.exception.ForbiddenException;
import com.cloudfuze.trainer.exception.ResourceNotFoundException;
import com.cloudfuze.trainer.repository.AssessmentSessionRepository;
import com.cloudfuze.trainer.repository.ProctorEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Records proctoring warnings raised by the client during an assessment. */
@Service
public class ProctorService {

    private final AssessmentSessionRepository sessionRepository;
    private final ProctorEventRepository proctorEventRepository;
    private final AuditService auditService;

    public ProctorService(AssessmentSessionRepository sessionRepository,
                          ProctorEventRepository proctorEventRepository, AuditService auditService) {
        this.sessionRepository = sessionRepository;
        this.proctorEventRepository = proctorEventRepository;
        this.auditService = auditService;
    }

    @Transactional
    public int recordWarning(User user, Long sessionId, String reason) {
        AssessmentSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));
        if (!session.getUser().getId().equals(user.getId())) {
            throw new ForbiddenException("This session does not belong to you");
        }
        String cleanReason = (reason == null || reason.isBlank()) ? "Unspecified violation" : reason;

        session.setProctorWarnings(session.getProctorWarnings() + 1);
        sessionRepository.save(session);

        ProctorEvent event = new ProctorEvent();
        event.setSession(session);
        event.setReason(cleanReason);
        proctorEventRepository.save(event);

        auditService.log(user.getEmail(), "PROCTOR_WARNING", "session=" + sessionId + " reason=" + cleanReason);
        return session.getProctorWarnings();
    }
}
