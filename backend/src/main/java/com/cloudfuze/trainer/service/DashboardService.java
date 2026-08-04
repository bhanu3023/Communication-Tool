package com.cloudfuze.trainer.service;

import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.domain.SessionStatus;
import com.cloudfuze.trainer.dto.dashboard.DashboardDtos;
import com.cloudfuze.trainer.entity.AssessmentSession;
import com.cloudfuze.trainer.entity.User;
import com.cloudfuze.trainer.repository.AssessmentSessionRepository;
import com.cloudfuze.trainer.service.ai.AiService;
import com.cloudfuze.trainer.service.ai.OverallFeedback;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private static final DateTimeFormatter DATE =
            DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm").withZone(ZoneId.systemDefault());
    private static final Section[] SECTIONS = {Section.LISTENING, Section.SPEAKING, Section.WRITING};

    private final AssessmentSessionRepository sessionRepository;
    private final AiService aiService;
    private final AttemptPolicy attemptPolicy;

    public DashboardService(AssessmentSessionRepository sessionRepository, AiService aiService,
                            AttemptPolicy attemptPolicy) {
        this.sessionRepository = sessionRepository;
        this.aiService = aiService;
        this.attemptPolicy = attemptPolicy;
    }

    /** Completed attempts for one section at one level, oldest first. */
    private List<AssessmentSession> completedAttempts(Long userId, Section section, int level) {
        return sessionRepository.findByUserIdAndSectionAndLevelAndStatusOrderByCreatedAtAsc(
                userId, section, level, SessionStatus.COMPLETED);
    }

    /** Builds the per-section card (attempts, latest/best score, improvement) for one level. */
    public DashboardDtos.SectionCard sectionCard(User user, Section section, int level) {
        AttemptPolicy.requireValidLevel(level);
        return card(user, section, level,
                completedAttempts(user.getId(), section, level),
                attemptPolicy.levelUnlocked(user.getId(), level));
    }

    /**
     * Builds a card from data the caller has ALREADY fetched. The attempt list and the
     * level-gate verdict are passed in because they are identical for all three sections
     * of a level — recomputing them per card re-ran the same queries three times over.
     */
    private DashboardDtos.SectionCard card(User user, Section section, int level,
                                           List<AssessmentSession> done, boolean unlocked) {
        int used = done.size();
        AttemptPolicy.SectionLimits limits = attemptPolicy.limits(user.getId(), section, level);
        int allowed = limits.allowed();
        double passMark = AttemptPolicy.passMark(level);
        Double latest = used > 0 ? done.get(used - 1).getScore() : null;
        Double best = done.stream().map(AssessmentSession::getScore)
                .filter(java.util.Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);
        Double improvement = (used >= 2 && latest != null && done.get(used - 2).getScore() != null)
                ? round(latest - done.get(used - 2).getScore()) : null;
        boolean passed = best != null && best >= passMark;
        boolean exhausted = used >= allowed;
        String result = passed ? "Passed"
                : used == 0 ? "Not started"
                : exhausted ? "Not passed"
                : "In progress";
        return new DashboardDtos.SectionCard(
                section.name(),
                level,
                unlocked,
                used > 0 ? "Completed" : "Not Started",
                latest, best, improvement,
                used, allowed,
                // A locked level can never be started, however many attempts remain.
                unlocked && used < allowed,
                exhausted,
                limits.requestPending(),
                passMark,
                passed,
                result);
    }

    /** All three section cards for one level — also used by the assessment hub. */
    public List<DashboardDtos.SectionCard> sectionCards(User user, int level) {
        AttemptPolicy.requireValidLevel(level);
        // The gate is a property of the LEVEL, not of a section: resolve it once.
        boolean unlocked = attemptPolicy.levelUnlocked(user.getId(), level);
        List<DashboardDtos.SectionCard> cards = new ArrayList<>();
        for (Section s : SECTIONS) {
            cards.add(card(user, s, level, completedAttempts(user.getId(), s, level), unlocked));
        }
        return cards;
    }

    /**
     * Dashboard WITHOUT the AI coaching summary. This is the default because building that
     * summary costs a live OpenAI round-trip (measured at 5-6s) and the Level 1/Level 2
     * dashboards never render it — only the AI Coach page does. See the overload below.
     */
    public DashboardDtos.EmployeeDashboard employeeDashboard(User user, int level) {
        return employeeDashboard(user, level, false);
    }

    /**
     * @param includeAi when true, spends a live OpenAI call to build the coaching summary.
     *                  Pass false unless the caller actually renders {@code aiFeedback} —
     *                  with it false the response is served entirely from the database.
     */
    public DashboardDtos.EmployeeDashboard employeeDashboard(User user, int level, boolean includeAi) {
        AttemptPolicy.requireValidLevel(level);
        boolean unlocked = attemptPolicy.levelUnlocked(user.getId(), level);
        // At Level 2 the level gate IS the Level 2 gate — don't ask the same question twice.
        boolean nextUnlocked = level == AttemptPolicy.LEVEL_TWO
                ? unlocked
                : attemptPolicy.levelUnlocked(user.getId(), AttemptPolicy.LEVEL_TWO);

        // Flat history for THIS level across sections, newest first, with per-section improvement.
        List<DashboardDtos.SectionCard> cards = new ArrayList<>();
        List<DashboardDtos.HistoryItem> history = new ArrayList<>();
        Double latestListening = null, latestSpeaking = null, latestWriting = null;
        for (Section s : SECTIONS) {
            // Fetched ONCE and used for both the card and the history rows below.
            List<AssessmentSession> done = completedAttempts(user.getId(), s, level);
            cards.add(card(user, s, level, done, unlocked));
            for (int i = 0; i < done.size(); i++) {
                Double score = done.get(i).getScore();
                Double prev = i > 0 ? done.get(i - 1).getScore() : null;
                Double improvement = (prev != null && score != null) ? round(score - prev) : null;
                history.add(new DashboardDtos.HistoryItem(
                        DATE.format(done.get(i).getCreatedAt()), s.name(), level,
                        done.get(i).getAttemptNumber(), score, improvement));
            }
            if (!done.isEmpty()) {
                Double last = done.get(done.size() - 1).getScore();
                switch (s) {
                    case LISTENING -> latestListening = last;
                    case SPEAKING -> latestSpeaking = last;
                    case WRITING -> latestWriting = last;
                }
            }
        }
        history.sort(Comparator.comparing(DashboardDtos.HistoryItem::date).reversed());

        // Null (not an empty panel) when not requested, so a caller that needs coaching text
        // can tell "not computed" from "computed and genuinely empty".
        DashboardDtos.AiFeedback ai = null;
        if (includeAi) {
            OverallFeedback fb = aiService.buildOverall(latestListening, latestSpeaking, latestWriting);
            ai = new DashboardDtos.AiFeedback(fb.strengths(), fb.weaknesses(), fb.suggestions());
        }
        return new DashboardDtos.EmployeeDashboard(
                user.getName(), level, unlocked, nextUnlocked, cards, history, ai);
    }

    private double round(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
