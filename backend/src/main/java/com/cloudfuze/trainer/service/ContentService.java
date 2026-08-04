package com.cloudfuze.trainer.service;

import com.cloudfuze.trainer.entity.ListeningStory;
import com.cloudfuze.trainer.entity.WritingPrompt;
import com.cloudfuze.trainer.exception.ResourceNotFoundException;
import com.cloudfuze.trainer.repository.ListeningStoryRepository;
import com.cloudfuze.trainer.repository.WritingPromptRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Selects question/sentence/prompt banks for each new assessment, scoped to the level
 * being attempted. Each level has its own bank (see the {@code level} column on the
 * content entities), so a Level 2 attempt can never serve Level 1 content.
 */
@Service
public class ContentService {

    private final ListeningStoryRepository listeningStoryRepo;
    private final WritingPromptRepository writingRepo;

    public ContentService(ListeningStoryRepository listeningStoryRepo,
                          WritingPromptRepository writingRepo) {
        this.listeningStoryRepo = listeningStoryRepo;
        this.writingRepo = writingRepo;
    }

    /** Picks one random listening story from the given level's bank. */
    public ListeningStory randomStory(int level) {
        List<ListeningStory> pool = listeningStoryRepo.findByLevelOrderByIdAsc(level);
        if (pool.isEmpty()) {
            throw new ResourceNotFoundException("No listening stories are configured for level " + level);
        }
        return pickRandom(pool, 1).get(0);
    }

    /** The category used for customer-email prompts (always the first writing task). */
    public static final String EMAIL_CATEGORY = "Customer Email";

    /**
     * Two writing tasks for one attempt: prompt 1 is always a customer EMAIL, prompt 2
     * is a task of any other type, both from the given level's bank. Falls back
     * gracefully if the bank is missing one group.
     */
    public List<WritingPrompt> writingPrompts(int level) {
        List<WritingPrompt> all = writingRepo.findByLevelOrderByIdAsc(level);
        List<WritingPrompt> emails = new ArrayList<>();
        List<WritingPrompt> others = new ArrayList<>();
        for (WritingPrompt p : all) {
            (EMAIL_CATEGORY.equalsIgnoreCase(p.getCategory()) ? emails : others).add(p);
        }
        List<WritingPrompt> out = new ArrayList<>();
        if (!emails.isEmpty()) out.add(pickRandom(emails, 1).get(0));
        if (!others.isEmpty()) out.add(pickRandom(others, 1).get(0));
        if (out.isEmpty()) {
            throw new ResourceNotFoundException("No writing prompts are configured for level " + level);
        }
        return out;
    }

    /** Randomly selects {@code count} items (a fresh mix each attempt). */
    private <T> List<T> pickRandom(List<T> all, int count) {
        List<T> copy = new ArrayList<>(all);
        Collections.shuffle(copy);
        return new ArrayList<>(copy.subList(0, Math.min(count, copy.size())));
    }
}
