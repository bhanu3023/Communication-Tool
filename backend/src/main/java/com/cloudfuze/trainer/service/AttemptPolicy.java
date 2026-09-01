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
 * Every level allows the same 2 attempts per section, so the pass mark is the only number
 * that differs; everything else (scoring, proctoring, feedback) is identical. The per-level
 * constants are kept separate so any one level can be re-tuned on its own:
 *
 * <pre>
 *   Level 1: 2 attempts per section, pass mark 75
 *   Level 2: 2 attempts per section, pass mark 80   (and it must be unlocked first)
 *   Level 3: 2 attempts per section, pass mark 85   (and it must be unlocked first)
 * </pre>
 *
 * <p>A level unlocks when ALL THREE sections of the level below it have been passed: Level 2
 * on Level 1, Level 3 on Level 2. That rule is expressed once, in {@link #levelUnlocked}, so a
 * fourth level would need only its two constants and an entry in the switches below.
 *
 * <p>Level 3 was added on 2026-09-02 without changing a single Level 1 or Level 2 number. The
 * generalisations here are deliberately shaped so that, for levels 1 and 2, they compute exactly
 * what the hard-coded versions computed before — including the wording of the locked message.
 */
@Component
public class AttemptPolicy {

    public static final int LEVEL_ONE = 1;
    public static final int LEVEL_TWO = 2;
    public static final int LEVEL_THREE = 3;
    public static final int MAX_LEVEL = LEVEL_THREE;

    /** Base attempts every candidate gets per section, at Level 1. */
    public static final int BASE_ATTEMPTS_PER_SECTION = 2;
    /** Base attempts per section at Level 2. */
    public static final int BASE_ATTEMPTS_PER_SECTION_LEVEL_2 = 2;
    /** Base attempts per section at Level 3. */
    public static final int BASE_ATTEMPTS_PER_SECTION_LEVEL_3 = 2;

    /** Score needed to pass a section (best attempt) at Level 1. */
    public static final double PASS_MARK = 75.0;
    /** Score needed to pass a section at Level 2 — a higher bar. */
    public static final double PASS_MARK_LEVEL_2 = 80.0;
    /** Score needed to pass a section at Level 3 — the highest bar the app sets. */
    public static final double PASS_MARK_LEVEL_3 = 85.0;

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
        return switch (level) {
            case LEVEL_THREE -> BASE_ATTEMPTS_PER_SECTION_LEVEL_3;
            case LEVEL_TWO -> BASE_ATTEMPTS_PER_SECTION_LEVEL_2;
            default -> BASE_ATTEMPTS_PER_SECTION;
        };
    }

    public static double passMark(int level) {
        return switch (level) {
            case LEVEL_THREE -> PASS_MARK_LEVEL_3;
            case LEVEL_TWO -> PASS_MARK_LEVEL_2;
            default -> PASS_MARK;
        };
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
     * Level 1 is always open. Every level above it opens only when all three sections of the
     * level immediately below have been passed — however many attempts that took.
     *
     * <p>Only the level DIRECTLY below is checked, which is not a shortcut: Level 2 cannot have
     * been passed without Level 1 having been passed first, because Level 2 could not have been
     * started otherwise. Walking the whole chain would ask the same question twice.
     */
    public boolean levelUnlocked(Long userId, int level) {
        if (level <= LEVEL_ONE) return true;
        for (Section s : Section.values()) {
            if (!passed(userId, s, level - 1)) return false;
        }
        return true;
    }

    /**
     * Why a level is closed, naming the level below it and that level's pass mark. For Level 2
     * this produces the exact sentence it produced before Level 3 existed — the wording is load
     * bearing, since it is what the candidate reads on a locked portal.
     */
    public String lockedMessage(int level) {
        int below = Math.max(LEVEL_ONE, level - 1);
        return "Level " + level + " is locked. Pass all three Level " + below + " sections first "
                + "(a best score of " + (int) passMark(below) + " or above in each).";
    }

    public String blockedMessage(Section section, int level) {
        return "You have used all your Level " + level + " attempts for the " + label(section)
                + " section. Please request another attempt from your manager.";
    }

    public static String label(Section section) {
        return section.name().charAt(0) + section.name().substring(1).toLowerCase();
    }
}
