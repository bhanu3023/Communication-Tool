package com.cloudfuze.trainer.service;

import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.domain.SessionStatus;
import com.cloudfuze.trainer.repository.AssessmentSessionRepository;
import com.cloudfuze.trainer.repository.SectionAttemptControlRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AttemptPolicyTest {

    private static final Long USER_ID = 42L;

    @Mock
    private AssessmentSessionRepository sessionRepository;

    @Mock
    private SectionAttemptControlRepository controlRepository;

    private AttemptPolicy policy;

    @BeforeEach
    void setUp() {
        policy = new AttemptPolicy(sessionRepository, controlRepository);
    }

    @Test
    void passMark_level1_is75_level2_is80() {
        assertEquals(75.0, AttemptPolicy.passMark(AttemptPolicy.LEVEL_ONE));
        assertEquals(80.0, AttemptPolicy.passMark(AttemptPolicy.LEVEL_TWO));
    }

    @Test
    void passed_level1_requiresBestAtOrAbove75() {
        when(sessionRepository.findBestScore(USER_ID, Section.LISTENING, 1)).thenReturn(74.9);
        assertFalse(policy.passed(USER_ID, Section.LISTENING, 1));

        when(sessionRepository.findBestScore(USER_ID, Section.LISTENING, 1)).thenReturn(75.0);
        assertTrue(policy.passed(USER_ID, Section.LISTENING, 1));
    }

    @Test
    void passed_level2_requiresBestAtOrAbove80() {
        when(sessionRepository.findBestScore(USER_ID, Section.SPEAKING, 2)).thenReturn(79.0);
        assertFalse(policy.passed(USER_ID, Section.SPEAKING, 2));

        when(sessionRepository.findBestScore(USER_ID, Section.SPEAKING, 2)).thenReturn(80.0);
        assertTrue(policy.passed(USER_ID, Section.SPEAKING, 2));
    }

    @Test
    void passed_returnsFalseWhenNeverCompleted() {
        when(sessionRepository.findBestScore(USER_ID, Section.WRITING, 1)).thenReturn(null);
        assertFalse(policy.passed(USER_ID, Section.WRITING, 1));
    }

    @Test
    void levelUnlocked_level1IsAlwaysOpen() {
        assertTrue(policy.levelUnlocked(USER_ID, AttemptPolicy.LEVEL_ONE));
    }

    @Test
    void levelUnlocked_level2RequiresAllThreeLevel1SectionsPassed() {
        when(sessionRepository.findBestScore(eq(USER_ID), eq(Section.LISTENING), eq(1))).thenReturn(80.0);
        when(sessionRepository.findBestScore(eq(USER_ID), eq(Section.SPEAKING), eq(1))).thenReturn(76.0);
        when(sessionRepository.findBestScore(eq(USER_ID), eq(Section.WRITING), eq(1))).thenReturn(74.0);
        assertFalse(policy.levelUnlocked(USER_ID, AttemptPolicy.LEVEL_TWO));

        when(sessionRepository.findBestScore(eq(USER_ID), eq(Section.WRITING), eq(1))).thenReturn(75.0);
        assertTrue(policy.levelUnlocked(USER_ID, AttemptPolicy.LEVEL_TWO));
    }

    @Test
    void baseAttempts_bothLevelsAllowTwo() {
        assertEquals(2, AttemptPolicy.baseAttempts(1));
        assertEquals(2, AttemptPolicy.baseAttempts(2));
    }

    @Test
    void attemptsUsed_countsCompletedSessions() {
        when(sessionRepository.countByUserIdAndSectionAndLevelAndStatus(
                USER_ID, Section.LISTENING, 1, SessionStatus.COMPLETED)).thenReturn(1L);
        assertEquals(1, policy.attemptsUsed(USER_ID, Section.LISTENING, 1));
    }
}
