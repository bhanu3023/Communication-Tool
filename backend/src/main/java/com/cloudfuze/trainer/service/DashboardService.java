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

    /** Completed attempts for one section, oldest first. */
    private List<AssessmentSession> completedAttempts(Long userId, Section section) {
        return sessionRepository.findByUserIdAndSectionAndStatusOrderByCreatedAtAsc(
                userId, section, SessionStatus.COMPLETED);
    }

    /** Builds the per-section card (attempts, latest/best score, improvement). */
    public DashboardDtos.SectionCard sectionCard(User user, Section section) {
        List<AssessmentSession> done = completedAttempts(user.getId(), section);
        int used = done.size();
        int allowed = attemptPolicy.attemptsAllowed(user.getId(), section);
        Double latest = used > 0 ? done.get(used - 1).getScore() : null;
        Double best = done.stream().map(AssessmentSession::getScore)
                .filter(java.util.Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);
        Double improvement = (used >= 2 && latest != null && done.get(used - 2).getScore() != null)
                ? round(latest - done.get(used - 2).getScore()) : null;
        return new DashboardDtos.SectionCard(
                section.name(),
                used > 0 ? "Completed" : "Not Started",
                latest, best, improvement,
                used, allowed,
                used < allowed,
                used >= allowed,
                attemptPolicy.requestPending(user.getId(), section));
    }

    /** All three section cards — also used by the assessment hub. */
    public List<DashboardDtos.SectionCard> sectionCards(User user) {
        List<DashboardDtos.SectionCard> cards = new ArrayList<>();
        for (Section s : SECTIONS) cards.add(sectionCard(user, s));
        return cards;
    }

    public DashboardDtos.EmployeeDashboard employeeDashboard(User user) {
        List<DashboardDtos.SectionCard> cards = sectionCards(user);

        // Flat history across sections, newest first, with per-section improvement.
        List<DashboardDtos.HistoryItem> history = new ArrayList<>();
        Double latestListening = null, latestSpeaking = null, latestWriting = null;
        for (Section s : SECTIONS) {
            List<AssessmentSession> done = completedAttempts(user.getId(), s);
            for (int i = 0; i < done.size(); i++) {
                Double score = done.get(i).getScore();
                Double prev = i > 0 ? done.get(i - 1).getScore() : null;
                Double improvement = (prev != null && score != null) ? round(score - prev) : null;
                history.add(new DashboardDtos.HistoryItem(
                        DATE.format(done.get(i).getCreatedAt()), s.name(), done.get(i).getAttemptNumber(),
                        score, improvement));
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

        OverallFeedback fb = aiService.buildOverall(latestListening, latestSpeaking, latestWriting);
        return new DashboardDtos.EmployeeDashboard(
                user.getName(), cards, history,
                new DashboardDtos.AiFeedback(fb.strengths(), fb.weaknesses(), fb.suggestions()));
    }

    private double round(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
