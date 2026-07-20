package com.cloudfuze.trainer.repository;

import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.domain.SessionStatus;
import com.cloudfuze.trainer.entity.AssessmentSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface AssessmentSessionRepository extends JpaRepository<AssessmentSession, Long> {

    /** Speaking sets this user has already been served (across attempts). */
    @Query("select distinct s.speakingSetNumber from AssessmentSession s "
            + "where s.user.id = :userId and s.speakingSetNumber is not null")
    List<Integer> findSpeakingSetsUsedByUser(Long userId);

    /** For each speaking set that has been served, the most recent time it was served. */
    @Query("select s.speakingSetNumber, max(s.createdAt) from AssessmentSession s "
            + "where s.speakingSetNumber is not null group by s.speakingSetNumber")
    List<Object[]> findSpeakingSetUsage();

    List<AssessmentSession> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<AssessmentSession> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, SessionStatus status);

    Optional<AssessmentSession> findFirstByUserIdAndStatusOrderByCreatedAtDesc(Long userId, SessionStatus status);

    long countByUserId(Long userId);

    // ---- per-section (each session belongs to one section) ----

    List<AssessmentSession> findByUserIdAndSectionOrderByCreatedAtAsc(Long userId, Section section);

    List<AssessmentSession> findByUserIdAndSectionAndStatusOrderByCreatedAtAsc(
            Long userId, Section section, SessionStatus status);

    Optional<AssessmentSession> findFirstByUserIdAndSectionAndStatusOrderByCreatedAtDesc(
            Long userId, Section section, SessionStatus status);

    long countByUserIdAndSection(Long userId, Section section);

    long countByUserIdAndSectionAndStatus(Long userId, Section section, SessionStatus status);
}
