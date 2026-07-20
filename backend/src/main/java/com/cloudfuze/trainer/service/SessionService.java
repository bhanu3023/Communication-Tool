package com.cloudfuze.trainer.service;

import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.domain.SessionStatus;
import com.cloudfuze.trainer.entity.AssessmentSession;
import com.cloudfuze.trainer.entity.SectionResult;
import com.cloudfuze.trainer.entity.User;
import com.cloudfuze.trainer.exception.ApiException;
import com.cloudfuze.trainer.exception.ResourceNotFoundException;
import com.cloudfuze.trainer.repository.AssessmentSessionRepository;
import com.cloudfuze.trainer.repository.SectionResultRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/** Owns the lifecycle of a single-section assessment attempt. */
@Service
public class SessionService {

    private final AssessmentSessionRepository sessionRepository;
    private final SectionResultRepository sectionResultRepository;
    private final AttemptPolicy attemptPolicy;

    public SessionService(AssessmentSessionRepository sessionRepository,
                          SectionResultRepository sectionResultRepository,
                          AttemptPolicy attemptPolicy) {
        this.sessionRepository = sessionRepository;
        this.sectionResultRepository = sectionResultRepository;
        this.attemptPolicy = attemptPolicy;
    }

    /**
     * Returns the active (in-progress) attempt for the given section, creating a
     * new one if none is open — enforcing that section's attempt limit.
     */
    @Transactional
    public AssessmentSession getOrCreateActiveSection(User user, Section section) {
        return sessionRepository
                .findFirstByUserIdAndSectionAndStatusOrderByCreatedAtDesc(
                        user.getId(), section, SessionStatus.IN_PROGRESS)
                .orElseGet(() -> {
                    if (!attemptPolicy.canStartNewAttempt(user.getId(), section)) {
                        throw new ApiException(HttpStatus.FORBIDDEN, attemptPolicy.blockedMessage(section));
                    }
                    AssessmentSession s = new AssessmentSession();
                    s.setUser(user);
                    s.setSection(section);
                    s.setStatus(SessionStatus.IN_PROGRESS);
                    s.setStartedAt(Instant.now());
                    s.setAttemptNumber((int) sessionRepository.countByUserIdAndSection(user.getId(), section) + 1);
                    return sessionRepository.save(s);
                });
    }

    public AssessmentSession requireOwnedActiveSession(User user, Long sessionId) {
        AssessmentSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));
        if (!session.getUser().getId().equals(user.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This session does not belong to you");
        }
        if (session.getStatus() == SessionStatus.COMPLETED) {
            throw new ApiException(HttpStatus.CONFLICT, "This attempt has already been submitted");
        }
        return session;
    }

    /** Records a section attempt's score + details and completes the attempt. */
    @Transactional
    public AssessmentSession completeSection(AssessmentSession session, Section section,
                                             double score, String detailsJson, String feedbackJson) {
        SectionResult result = sectionResultRepository
                .findBySessionIdAndSection(session.getId(), section)
                .orElseGet(SectionResult::new);
        result.setSession(session);
        result.setSection(section);
        result.setScore(score);
        result.setDetails(detailsJson);
        result.setFeedback(feedbackJson);
        sectionResultRepository.save(result);

        session.setScore(score);
        session.setStatus(SessionStatus.COMPLETED);
        session.setCompletedAt(Instant.now());
        return sessionRepository.save(session);
    }
}
