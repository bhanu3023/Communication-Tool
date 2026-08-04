package com.cloudfuze.trainer.repository;

import com.cloudfuze.trainer.entity.ListeningStory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ListeningStoryRepository extends JpaRepository<ListeningStory, Long> {

    /** The story bank for one level (Level 2 has its own, harder stories). */
    List<ListeningStory> findByLevelOrderByIdAsc(int level);
}
