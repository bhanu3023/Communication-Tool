package com.cloudfuze.trainer.service;

import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.dto.dashboard.DashboardDtos;
import com.cloudfuze.trainer.repository.ListeningStoryRepository;
import com.cloudfuze.trainer.repository.SpeakingSentenceRepository;
import com.cloudfuze.trainer.repository.WritingPromptRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Whether a level actually has questions to serve yet.
 *
 * <p>A level is real in code the moment {@link AttemptPolicy} knows its number, but its content
 * banks are seeded separately and can legitimately be empty for a while — Level 3 shipped with
 * its plumbing complete and not one question written. Without this, the only way a candidate
 * would discover that is by starting a test and meeting a 404 from the content selector, mid
 * attempt, having already spent one of their two tries getting there.
 *
 * <p>So the portal asks first and says so plainly. Cheap by construction: three counts, run only
 * when a level portal is opened, and never on the dashboard or hub paths that Level 1 and Level 2
 * candidates use.
 */
@Service
public class ContentReadinessService {

    private final ListeningStoryRepository listeningRepo;
    private final SpeakingSentenceRepository speakingRepo;
    private final WritingPromptRepository writingRepo;

    public ContentReadinessService(ListeningStoryRepository listeningRepo,
                                   SpeakingSentenceRepository speakingRepo,
                                   WritingPromptRepository writingRepo) {
        this.listeningRepo = listeningRepo;
        this.speakingRepo = speakingRepo;
        this.writingRepo = writingRepo;
    }

    /**
     * Per-section content counts for one level.
     *
     * <p>The unit differs by section on purpose, because it is what a candidate is actually
     * served: one story for Listening, one SET of ten sentences for Speaking, and one prompt per
     * task for Writing. Reporting 2,000 speaking sentences would be true and useless.
     */
    public DashboardDtos.LevelReadiness readiness(int level) {
        AttemptPolicy.requireValidLevel(level);

        int stories = listeningRepo.findByLevelOrderByIdAsc(level).size();
        int sets = speakingRepo.findDistinctSetNumbersByLevel(level).size();
        int prompts = writingRepo.findByLevelOrderByIdAsc(level).size();

        List<DashboardDtos.SectionReadiness> sections = new ArrayList<>();
        sections.add(section(Section.LISTENING, stories, "story", "stories"));
        sections.add(section(Section.SPEAKING, sets, "sentence set", "sentence sets"));
        // Writing serves two tasks per attempt, so one prompt is not enough to run a test.
        sections.add(new DashboardDtos.SectionReadiness(
                Section.WRITING.name(), prompts, prompts >= 2,
                prompts == 0 ? "No prompts yet" : prompts + (prompts == 1 ? " prompt" : " prompts")));

        boolean ready = sections.stream().allMatch(DashboardDtos.SectionReadiness::ready);
        return new DashboardDtos.LevelReadiness(level, ready, sections);
    }

    private DashboardDtos.SectionReadiness section(Section section, int count, String one, String many) {
        return new DashboardDtos.SectionReadiness(
                section.name(), count, count > 0,
                count == 0 ? "No " + many + " yet" : count + " " + (count == 1 ? one : many));
    }
}
