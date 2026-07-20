package com.cloudfuze.trainer.repository;

import com.cloudfuze.trainer.entity.SpeakingSentence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SpeakingSentenceRepository extends JpaRepository<SpeakingSentence, Long> {

    /** The 10 sentences of one fixed set, in a stable order. */
    List<SpeakingSentence> findBySetNumberOrderByIdAsc(int setNumber);

    /** All distinct set numbers that have been seeded, ascending (e.g. 1..50). */
    @Query("select distinct s.setNumber from SpeakingSentence s order by s.setNumber asc")
    List<Integer> findDistinctSetNumbers();
}
