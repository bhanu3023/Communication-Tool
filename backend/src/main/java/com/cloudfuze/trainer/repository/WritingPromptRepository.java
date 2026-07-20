package com.cloudfuze.trainer.repository;

import com.cloudfuze.trainer.entity.WritingPrompt;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WritingPromptRepository extends JpaRepository<WritingPrompt, Long> {
}
