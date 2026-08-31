package com.cloudfuze.trainer.service;

import com.cloudfuze.trainer.entity.AssessmentSession;
import com.cloudfuze.trainer.entity.ListeningStory;
import com.cloudfuze.trainer.entity.User;
import com.cloudfuze.trainer.entity.WritingPrompt;
import com.cloudfuze.trainer.exception.ResourceNotFoundException;
import com.cloudfuze.trainer.repository.AssessmentSessionRepository;
import com.cloudfuze.trainer.repository.ListeningStoryRepository;
import com.cloudfuze.trainer.repository.WritingPromptRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Chooses the Listening story and the two Writing prompts for an attempt, and pins them to
 * the session. This is the Listening/Writing counterpart of {@link SpeakingSetService} and
 * follows exactly the same rules, because the three sections should behave the same way.
 *
 * <p>It replaces a plain random draw that had two faults. The draw happened on every call to
 * start, and nothing was recorded on the session, so a candidate who reloaded mid-attempt was
 * handed a different story or different prompts than the ones they had begun. Nothing
 * consulted the candidate's history either, so a retake could serve the very same content
 * again — with five Level 1 stories that was roughly a one-in-five chance.
 *
 * <p>Both faults are fixed by the same mechanism: choose once, write the choice onto the
 * session, and thereafter return what the session already records.
 */
@Service
public class ContentAssignmentService {

    private final ListeningStoryRepository listeningStoryRepo;
    private final WritingPromptRepository writingRepo;
    private final AssessmentSessionRepository sessionRepository;

    public ContentAssignmentService(ListeningStoryRepository listeningStoryRepo,
                                    WritingPromptRepository writingRepo,
                                    AssessmentSessionRepository sessionRepository) {
        this.listeningStoryRepo = listeningStoryRepo;
        this.writingRepo = writingRepo;
        this.sessionRepository = sessionRepository;
    }

    /** The story for this Listening attempt, assigning and pinning one on first use. */
    @Transactional
    public ListeningStory storyForSession(User user, AssessmentSession session) {
        int level = session.getLevel();
        List<ListeningStory> pool = listeningStoryRepo.findByLevelOrderByIdAsc(level);
        if (pool.isEmpty()) {
            throw new ResourceNotFoundException("No listening stories are configured for level " + level);
        }

        if (session.getListeningStoryId() != null) {
            for (ListeningStory s : pool) {
                if (s.getId().equals(session.getListeningStoryId())) {
                    return s;
                }
            }
            // The pinned story has since been removed from the bank. Falling through re-assigns
            // rather than failing the attempt, which is the kinder outcome for the candidate.
        }

        Set<Long> usedByUser =
                new HashSet<>(sessionRepository.findListeningStoriesUsedByUserAndLevel(user.getId(), level));
        Map<Long, Instant> lastUsed = usage(sessionRepository.findListeningStoryUsageByLevel(level));

        List<Long> ids = new ArrayList<>();
        for (ListeningStory s : pool) {
            ids.add(s.getId());
        }
        Long chosen = pickLeastRecentlyUsed(ids, usedByUser, lastUsed);

        session.setListeningStoryId(chosen);
        sessionRepository.save(session);
        for (ListeningStory s : pool) {
            if (s.getId().equals(chosen)) {
                return s;
            }
        }
        throw new ResourceNotFoundException("Listening story " + chosen + " disappeared while assigning");
    }

    /**
     * The two prompts for this Writing attempt, assigning and pinning them on first use.
     * Prompt one is always a customer email and prompt two is any other task, so the two
     * pools are drawn from — and excluded — independently.
     */
    @Transactional
    public List<WritingPrompt> promptsForSession(User user, AssessmentSession session) {
        int level = session.getLevel();
        List<WritingPrompt> all = writingRepo.findByLevelOrderByIdAsc(level);
        List<WritingPrompt> emails = new ArrayList<>();
        List<WritingPrompt> others = new ArrayList<>();
        for (WritingPrompt p : all) {
            (ContentService.EMAIL_CATEGORY.equalsIgnoreCase(p.getCategory()) ? emails : others).add(p);
        }
        if (emails.isEmpty() && others.isEmpty()) {
            throw new ResourceNotFoundException("No writing prompts are configured for level " + level);
        }

        List<WritingPrompt> out = new ArrayList<>();

        WritingPrompt email = resolve(emails, session.getWritingEmailPromptId(),
                sessionRepository.findWritingEmailPromptsUsedByUserAndLevel(user.getId(), level),
                sessionRepository.findWritingEmailPromptUsageByLevel(level));
        if (email != null) {
            session.setWritingEmailPromptId(email.getId());
            out.add(email);
        }

        WritingPrompt other = resolve(others, session.getWritingOtherPromptId(),
                sessionRepository.findWritingOtherPromptsUsedByUserAndLevel(user.getId(), level),
                sessionRepository.findWritingOtherPromptUsageByLevel(level));
        if (other != null) {
            session.setWritingOtherPromptId(other.getId());
            out.add(other);
        }

        sessionRepository.save(session);
        return out;
    }

    /** Returns the already-pinned prompt if it is still in the pool, otherwise picks one. */
    private WritingPrompt resolve(List<WritingPrompt> pool, Long pinned,
                                  List<Long> usedByUser, List<Object[]> usageRows) {
        if (pool.isEmpty()) {
            return null;
        }
        if (pinned != null) {
            for (WritingPrompt p : pool) {
                if (p.getId().equals(pinned)) {
                    return p;
                }
            }
        }
        List<Long> ids = new ArrayList<>();
        for (WritingPrompt p : pool) {
            ids.add(p.getId());
        }
        Long chosen = pickLeastRecentlyUsed(ids, new HashSet<>(usedByUser), usage(usageRows));
        for (WritingPrompt p : pool) {
            if (p.getId().equals(chosen)) {
                return p;
            }
        }
        return pool.get(0);
    }

    private Map<Long, Instant> usage(List<Object[]> rows) {
        Map<Long, Instant> lastUsed = new HashMap<>();
        for (Object[] row : rows) {
            if (row[0] != null) {
                lastUsed.put(((Number) row[0]).longValue(), (Instant) row[1]);
            }
        }
        return lastUsed;
    }

    /**
     * Picks an item the user has not had before, preferring the one served least recently
     * overall so that the bank spreads evenly across candidates rather than clustering.
     * Falls back to the whole pool once the user has exhausted it, which keeps an attempt
     * possible instead of failing it — the bank is sized so that should not arise.
     */
    private Long pickLeastRecentlyUsed(List<Long> all, Set<Long> usedByUser, Map<Long, Instant> lastUsed) {
        List<Long> candidates = new ArrayList<>();
        for (Long id : all) {
            if (!usedByUser.contains(id)) {
                candidates.add(id);
            }
        }
        if (candidates.isEmpty()) {
            candidates = all;
        }

        Long best = null;
        Instant bestWhen = null;
        for (Long id : candidates) {
            Instant when = lastUsed.get(id);
            if (when == null) {
                return id; // never served — the best possible pick
            }
            if (best == null || when.isBefore(bestWhen)) {
                best = id;
                bestWhen = when;
            }
        }
        return best;
    }
}
