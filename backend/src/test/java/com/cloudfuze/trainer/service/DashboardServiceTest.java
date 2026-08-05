package com.cloudfuze.trainer.service;

import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.domain.SessionStatus;
import com.cloudfuze.trainer.dto.dashboard.DashboardDtos;
import com.cloudfuze.trainer.entity.AssessmentSession;
import com.cloudfuze.trainer.entity.User;
import com.cloudfuze.trainer.repository.AssessmentSessionRepository;
import com.cloudfuze.trainer.service.ai.AiService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private AssessmentSessionRepository sessionRepository;

    @Mock
    private AiService aiService;

    @Mock
    private AttemptPolicy attemptPolicy;

    private DashboardService dashboardService;
    private User user;

    @BeforeEach
    void setUp() {
        dashboardService = new DashboardService(sessionRepository, aiService, attemptPolicy);
        user = new User();
        user.setId(7L);
        user.setName("Test User");
    }

    private AssessmentSession session(double score) {
        AssessmentSession s = new AssessmentSession();
        s.setScore(score);
        s.setCreatedAt(Instant.parse("2025-01-01T10:00:00Z"));
        return s;
    }

    private void stubEmptySection(Section section, int level) {
        when(sessionRepository.findByUserIdAndSectionAndLevelAndStatusOrderByCreatedAtAsc(
                eq(user.getId()), eq(section), eq(level), eq(SessionStatus.COMPLETED)))
                .thenReturn(List.of());
        when(attemptPolicy.limits(user.getId(), section, level))
                .thenReturn(new AttemptPolicy.SectionLimits(2, false));
    }

    @Test
    void sectionCard_notStarted_whenNoAttempts() {
        stubEmptySection(Section.LISTENING, 1);
        when(attemptPolicy.levelUnlocked(user.getId(), 1)).thenReturn(true);

        DashboardDtos.SectionCard card = dashboardService.sectionCard(user, Section.LISTENING, 1);

        assertEquals("Not started", card.result());
        assertEquals("Not Started", card.status());
        assertFalse(card.passed());
        assertEquals(75.0, card.passMark());
        assertTrue(card.canStart());
    }

    @Test
    void sectionCard_inProgress_whenBelowPassMarkWithAttemptsRemaining() {
        when(sessionRepository.findByUserIdAndSectionAndLevelAndStatusOrderByCreatedAtAsc(
                user.getId(), Section.SPEAKING, 1, SessionStatus.COMPLETED))
                .thenReturn(List.of(session(70.0)));
        when(attemptPolicy.limits(user.getId(), Section.SPEAKING, 1))
                .thenReturn(new AttemptPolicy.SectionLimits(2, false));
        when(attemptPolicy.levelUnlocked(user.getId(), 1)).thenReturn(true);

        DashboardDtos.SectionCard card = dashboardService.sectionCard(user, Section.SPEAKING, 1);

        assertEquals("In progress", card.result());
        assertFalse(card.passed());
        assertTrue(card.canStart());
        assertFalse(card.exhausted());
    }

    @Test
    void sectionCard_passed_whenBestMeetsLevel1PassMark() {
        when(sessionRepository.findByUserIdAndSectionAndLevelAndStatusOrderByCreatedAtAsc(
                user.getId(), Section.WRITING, 1, SessionStatus.COMPLETED))
                .thenReturn(List.of(session(75.0)));
        when(attemptPolicy.limits(user.getId(), Section.WRITING, 1))
                .thenReturn(new AttemptPolicy.SectionLimits(2, false));
        when(attemptPolicy.levelUnlocked(user.getId(), 1)).thenReturn(true);

        DashboardDtos.SectionCard card = dashboardService.sectionCard(user, Section.WRITING, 1);

        assertEquals("Passed", card.result());
        assertTrue(card.passed());
    }

    @Test
    void sectionCard_notPassed_whenExhaustedBelowPassMark() {
        when(sessionRepository.findByUserIdAndSectionAndLevelAndStatusOrderByCreatedAtAsc(
                user.getId(), Section.LISTENING, 1, SessionStatus.COMPLETED))
                .thenReturn(List.of(session(60.0), session(74.0)));
        when(attemptPolicy.limits(user.getId(), Section.LISTENING, 1))
                .thenReturn(new AttemptPolicy.SectionLimits(2, false));
        when(attemptPolicy.levelUnlocked(user.getId(), 1)).thenReturn(true);

        DashboardDtos.SectionCard card = dashboardService.sectionCard(user, Section.LISTENING, 1);

        assertEquals("Not passed", card.result());
        assertFalse(card.passed());
        assertTrue(card.exhausted());
        assertFalse(card.canStart());
    }

    @Test
    void sectionCard_level2UsesPassMark80() {
        when(sessionRepository.findByUserIdAndSectionAndLevelAndStatusOrderByCreatedAtAsc(
                user.getId(), Section.LISTENING, 2, SessionStatus.COMPLETED))
                .thenReturn(List.of(session(79.0)));
        when(attemptPolicy.limits(user.getId(), Section.LISTENING, 2))
                .thenReturn(new AttemptPolicy.SectionLimits(2, false));
        when(attemptPolicy.levelUnlocked(user.getId(), 2)).thenReturn(true);

        DashboardDtos.SectionCard card = dashboardService.sectionCard(user, Section.LISTENING, 2);

        assertEquals(80.0, card.passMark());
        assertEquals("In progress", card.result());
        assertFalse(card.passed());

        when(sessionRepository.findByUserIdAndSectionAndLevelAndStatusOrderByCreatedAtAsc(
                user.getId(), Section.LISTENING, 2, SessionStatus.COMPLETED))
                .thenReturn(List.of(session(80.0)));
        card = dashboardService.sectionCard(user, Section.LISTENING, 2);
        assertTrue(card.passed());
    }

    @Test
    void sectionCard_canStartFalseWhenLevelLocked() {
        stubEmptySection(Section.SPEAKING, 2);
        when(attemptPolicy.levelUnlocked(user.getId(), 2)).thenReturn(false);

        DashboardDtos.SectionCard card = dashboardService.sectionCard(user, Section.SPEAKING, 2);

        assertFalse(card.levelUnlocked());
        assertFalse(card.canStart());
    }

    @Test
    void employeeDashboard_nextLevelUnlockedReflectsLevel2Gate() {
        for (Section s : Section.values()) {
            when(sessionRepository.findByUserIdAndSectionAndLevelAndStatusOrderByCreatedAtAsc(
                    eq(user.getId()), eq(s), eq(1), eq(SessionStatus.COMPLETED)))
                    .thenReturn(List.of());
            when(attemptPolicy.limits(user.getId(), s, 1))
                    .thenReturn(new AttemptPolicy.SectionLimits(2, false));
        }
        when(attemptPolicy.levelUnlocked(user.getId(), 1)).thenReturn(true);
        when(attemptPolicy.levelUnlocked(user.getId(), 2)).thenReturn(false);

        DashboardDtos.EmployeeDashboard dash = dashboardService.employeeDashboard(user, 1, false);

        assertFalse(dash.nextLevelUnlocked());
        assertEquals(null, dash.aiFeedback());
    }
}
