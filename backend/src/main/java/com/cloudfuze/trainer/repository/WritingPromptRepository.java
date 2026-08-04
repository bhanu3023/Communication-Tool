package com.cloudfuze.trainer.repository;

import com.cloudfuze.trainer.entity.WritingPrompt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WritingPromptRepository extends JpaRepository<WritingPrompt, Long> {

    /** The prompt bank for one level (Level 2 has its own, harder tasks). */
    List<WritingPrompt> findByLevelOrderByIdAsc(int level);
}
