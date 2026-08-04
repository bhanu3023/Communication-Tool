package com.cloudfuze.trainer.service;

import com.cloudfuze.trainer.entity.AssessmentSession;
import com.cloudfuze.trainer.entity.SpeakingSentence;
import com.cloudfuze.trainer.entity.User;
import com.cloudfuze.trainer.exception.ResourceNotFoundException;
import com.cloudfuze.trainer.repository.AssessmentSessionRepository;
import com.cloudfuze.trainer.repository.SpeakingSentenceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Serves the 10 sentences for a Speaking attempt, from the bank of the level being
 * attempted. Each attempt gets a set the user has not been served before at that level,
 * chosen least-recently-used so sets spread evenly across users. The chosen set is
 * pinned to the attempt (session) so reloading shows the same sentences.
 */
@Service
public class SpeakingSetService {

    private final SpeakingSentenceRepository speakingRepo;
    private final AssessmentSessionRepository sessionRepository;

    public SpeakingSetService(SpeakingSentenceRepository speakingRepo,
                              AssessmentSessionRepository sessionRepository) {
        this.speakingRepo = speakingRepo;
        this.sessionRepository = sessionRepository;
    }

    /** Returns the sentences for this Speaking attempt, assigning a set on first use. */
    @Transactional
    public List<SpeakingSentence> sentencesForSession(User user, AssessmentSession session) {
        int level = session.getLevel();
        if (session.getSpeakingSetNumber() == null) {
            session.setSpeakingSetNumber(pickSet(user, level));
            sessionRepository.save(session);
        }
        List<SpeakingSentence> sentences =
                speakingRepo.findByLevelAndSetNumberOrderByIdAsc(level, session.getSpeakingSetNumber());
        if (sentences.isEmpty()) {
            throw new ResourceNotFoundException(
                    "No sentences for level " + level + " speaking set " + session.getSpeakingSetNumber());
        }
        return sentences;
    }

    /**
     * Picks a set the user has NOT used yet at this level (so a retake never repeats
     * their own questions), preferring the least-recently-used set overall. Falls back
     * to global LRU if the user has already used every set at this level.
     */
    private int pickSet(User user, int level) {
        List<Integer> allSets = speakingRepo.findDistinctSetNumbersByLevel(level);
        if (allSets.isEmpty()) {
            throw new ResourceNotFoundException("No speaking sets are configured for level " + level);
        }

        Set<Integer> usedByUser =
                new HashSet<>(sessionRepository.findSpeakingSetsUsedByUserAndLevel(user.getId(), level));

        Map<Integer, Instant> lastUsed = new HashMap<>();
        for (Object[] row : sessionRepository.findSpeakingSetUsageByLevel(level)) {
            if (row[0] != null) {
                lastUsed.put((Integer) row[0], (Instant) row[1]);
            }
        }

        // Candidates: sets the user hasn't used; if none left, allow any set.
        List<Integer> candidates = allSets.stream().filter(s -> !usedByUser.contains(s)).toList();
        if (candidates.isEmpty()) {
            candidates = allSets;
        }

        Integer best = null;
        Instant bestWhen = null;
        for (Integer set : candidates) {
            Instant when = lastUsed.get(set);
            if (when == null) {
                return set; // never served — best possible pick
            }
            if (best == null || when.isBefore(bestWhen)) {
                best = set;
                bestWhen = when;
            }
        }
        return best;
    }
}
