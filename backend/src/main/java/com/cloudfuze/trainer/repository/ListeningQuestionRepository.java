package com.cloudfuze.trainer.repository;

import com.cloudfuze.trainer.entity.ListeningQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ListeningQuestionRepository extends JpaRepository<ListeningQuestion, Long> {
    List<ListeningQuestion> findByStoryIdOrderByOrdinalAsc(Long storyId);
}
