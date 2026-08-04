package com.cloudfuze.trainer.service;

import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.domain.SessionStatus;
import com.cloudfuze.trainer.repository.AssessmentSessionRepository;
import com.cloudfuze.trainer.repository.SectionAttemptControlRepository;
import org.springframework.stereotype.Component;

/**
 * Per-section, PER-LEVEL attempt rules. Each section is attempted independently and
 * gets its own attempts at each level; when a section's attempts are used up the
 * candidate may request more from their manager.
 *
 * Both levels now allow the same 2 attempts per section, so the pass mark is the only
 * number that differs; everything else (scoring, proctoring, feedback) is identical. The
 * per-level constants are kept separate so either level can be re-tuned on its own:
 *
 * <pre>
 *   Level 1: 2 attempts per section, pass mark 75
 *   Level 2: 2 attempts per section, pass mark 80   (and it must be unlocked first)
 * </pre>
 *
 * Level 2 unlocks only when ALL THREE Level 1 sections have been passed.
 */
@Component
public class AttemptPolicy {

    public static final int LEVEL_ONE = 1;
    public static final int LEVEL_TWO = 2;
    public static final int MAX_LEVEL = LEVEL_TWO;

    /** Base attempts every candidate gets per section, at Level 1. */
    public static final int BASE_ATTEMPTS_PER_SECTION = 2;
    /** Base attempts per section at Level 2. */
    public static final int BASE_ATTEMPTS_PER_SECTION_LEVEL_2 = 2;

    /** Score needed to pass a section (best attempt) at Level 1. */
    public static final double PASS_MARK = 75.0;
    /** Score needed to pass a section at Level 2 — a higher bar. */
    public static final double PASS_MARK_LEVEL_2 = 80.0;

    private final AssessmentSessionRepository sessionRepository;
    private final SectionAttemptControlRepository controlRepository;

    public AttemptPolicy(AssessmentSessionRepository sessionRepository,
                         SectionAttemptControlRepository controlRepository) {
        this.sessionRepository = sessionRepository;
        this.controlRepository = controlRepository;
    }

    /** Rejects anything outside the levels the app knows about. */
    public static int requireValidLevel(int level) {
        if (level < LEVEL_ONE || level > MAX_LEVEL) {
            throw new IllegalArgumentException("Unknown level: " + level);
        }
        return level;
    }

    public static int baseAttempts(int level) {
        return level == LEVEL_TWO ? BASE_ATTEMPTS_PER_SECTION_LEVEL_2 : BASE_ATTEMPTS_PER_SECTION;
    }

    public static double passMark(int level) {
        return level == LEVEL_TWO ? PASS_MARK_LEVEL_2 : PASS_MARK;
    }

    // ---- attempt accounting (always scoped to one section at one level) ----

    /** Completed attempts a user has taken for a section at a level. */
    public int attemptsUsed(Long userId, Section section, int level) {
        return (int) sessionRepository.countByUserIdAndSectionAndLevelAndStatus(
                userId, section, level, SessionStatus.COMPLETED);
    }

    public int extraGranted(Long userId, Section section, int level) {
        return controlRepository.findByUserIdAndSectionAndLevel(userId, section, level)
                .map(c -> Math.max(0, c.getExtraGranted())).orElse(0);
    }

    public int attemptsAllowed(Long userId, Section section, int level) {
        return baseAttempts(level) + extraGranted(userId, section, level);
    }

    public boolean canStartNewAttempt(Long userId, Section section, int level) {
        return attemptsUsed(userId, section, level) < attemptsAllowed(userId, section, level);
    }

    /** True once all allowed attempts for a section at this level are used up. */
    public boolean exhausted(Long userId, Section section, int level) {
        return attemptsUsed(userId, section, level) >= attemptsAllowed(userId, section, level);
    }

    public boolean requestPending(Long userId, Section section, int level) {
        return controlRepository.findByUserIdAndSectionAndLevel(userId, section, level)
                .map(com.cloudfuze.trainer.entity.SectionAttemptControl::isRequestPending).orElse(false);
    }

    /** Allowed-attempts and pending-request state together. */
    public record SectionLimits(int allowed, boolean requestPending) {
    }

    /**
     * Both control-derived values in ONE repository hit. Callers that need the allowance
     * *and* the pending flag (every dashboard card does) would otherwise read the same
     * {@code section_attempt_control} row twice per section.
     */
    public SectionLimits limits(Long userId, Section section, int level) {
        return controlRepository.findByUserIdAndSectionAndLevel(userId, section, level)
                .map(c -> new SectionLimits(baseAttempts(level) + Math.max(0, c.getExtraGranted()),
                        c.isRequestPending()))
                .orElseGet(() -> new SectionLimits(baseAttempts(level), false));
    }

    // ---- passing and the Level 2 gate ----

    /** Best completed score for a section at a level (null if never completed). */
    public Double bestScore(Long userId, Section section, int level) {
        return sessionRepository.findBestScore(userId, section, level);
    }

    public boolean passed(Long userId, Section section, int level) {
        Double best = bestScore(userId, section, level);
        return best != null && best >= passMark(level);
    }

    /**
     * Level 1 is always open. Level 2 opens only when every Level 1 section has been
     * passed — however many attempts that took.
     */
    public boolean levelUnlocked(Long userId, int level) {
        if (level <= LEVEL_ONE) return true;
        for (Section s : Section.values()) {
            if (!passed(userId, s, LEVEL_ONE)) return false;
        }
        return true;
    }

    /** Sections still standing between the candidate and Level 2. */
    public String lockedMessage(int level) {
        return "Level " + level + " is locked. Pass all three Level 1 sections first "
                + "(a best score of " + (int) PASS_MARK + " or above in each).";
    }

    public String blockedMessage(Section section, int level) {
        return "You have used all your Level " + level + " attempts for the " + label(section)
                + " section. Please request another attempt from your manager.";
    }

    public static String label(Section section) {
        return section.name().charAt(0) + section.name().substring(1).toLowerCase();
    }
}
