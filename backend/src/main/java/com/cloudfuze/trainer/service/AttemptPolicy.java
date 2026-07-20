package com.cloudfuze.trainer.service;

import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.domain.SessionStatus;
import com.cloudfuze.trainer.repository.AssessmentSessionRepository;
import com.cloudfuze.trainer.repository.SectionAttemptControlRepository;
import org.springframework.stereotype.Component;

/**
 * Per-section attempt rules. Each section (Listening, Speaking, Writing) is
 * attempted independently and gets its own attempts. There is no pass/fail and
 * no combined score — when a section's attempts are used up the candidate may
 * request more from their manager.
 */
@Component
public class AttemptPolicy {

    /** Base attempts every candidate gets per section. */
    public static final int BASE_ATTEMPTS_PER_SECTION = 3;
    /** Score needed to pass a section (best attempt). */
    public static final double PASS_MARK = 75.0;

    private final AssessmentSessionRepository sessionRepository;
    private final SectionAttemptControlRepository controlRepository;

    public AttemptPolicy(AssessmentSessionRepository sessionRepository,
                         SectionAttemptControlRepository controlRepository) {
        this.sessionRepository = sessionRepository;
        this.controlRepository = controlRepository;
    }

    /** Completed attempts a user has taken for a section. */
    public int attemptsUsed(Long userId, Section section) {
        return (int) sessionRepository.countByUserIdAndSectionAndStatus(userId, section, SessionStatus.COMPLETED);
    }

    public int extraGranted(Long userId, Section section) {
        return controlRepository.findByUserIdAndSection(userId, section)
                .map(c -> Math.max(0, c.getExtraGranted())).orElse(0);
    }

    public int attemptsAllowed(Long userId, Section section) {
        return BASE_ATTEMPTS_PER_SECTION + extraGranted(userId, section);
    }

    public boolean canStartNewAttempt(Long userId, Section section) {
        return attemptsUsed(userId, section) < attemptsAllowed(userId, section);
    }

    /** True once all allowed attempts for a section are used up. */
    public boolean exhausted(Long userId, Section section) {
        return attemptsUsed(userId, section) >= attemptsAllowed(userId, section);
    }

    public boolean requestPending(Long userId, Section section) {
        return controlRepository.findByUserIdAndSection(userId, section)
                .map(com.cloudfuze.trainer.entity.SectionAttemptControl::isRequestPending).orElse(false);
    }

    public String blockedMessage(Section section) {
        return "You have used all your attempts for the " + label(section)
                + " section. Please request another attempt from your manager.";
    }

    public static String label(Section section) {
        return section.name().charAt(0) + section.name().substring(1).toLowerCase();
    }
}
