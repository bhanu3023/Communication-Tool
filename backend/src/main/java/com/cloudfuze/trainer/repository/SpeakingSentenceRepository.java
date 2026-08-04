package com.cloudfuze.trainer.repository;

import com.cloudfuze.trainer.entity.SpeakingSentence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SpeakingSentenceRepository extends JpaRepository<SpeakingSentence, Long> {

    /** The 10 sentences of one fixed set within one level, in a stable order. */
    List<SpeakingSentence> findByLevelAndSetNumberOrderByIdAsc(int level, int setNumber);

    /** Distinct set numbers seeded for one level, ascending (Level 1 has 1..100). */
    @Query("select distinct s.setNumber from SpeakingSentence s where s.level = :level order by s.setNumber asc")
    List<Integer> findDistinctSetNumbersByLevel(int level);
}
