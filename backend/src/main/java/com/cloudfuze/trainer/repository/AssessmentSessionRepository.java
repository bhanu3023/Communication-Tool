package com.cloudfuze.trainer.repository;

import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.domain.SessionStatus;
import com.cloudfuze.trainer.entity.AssessmentSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
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

    // ---- per-section AND per-level (Level 1 and Level 2 are fully independent) ----

    List<AssessmentSession> findByUserIdAndSectionAndLevelAndStatusOrderByCreatedAtAsc(
            Long userId, Section section, int level, SessionStatus status);

    Optional<AssessmentSession> findFirstByUserIdAndSectionAndLevelAndStatusOrderByCreatedAtDesc(
            Long userId, Section section, int level, SessionStatus status);

    long countByUserIdAndSectionAndLevel(Long userId, Section section, int level);

    long countByUserIdAndSectionAndLevelAndStatus(
            Long userId, Section section, int level, SessionStatus status);

    List<AssessmentSession> findByUserIdAndLevelOrderByCreatedAtDesc(Long userId, int level);

    /** Best completed score for one section at one level, or null if never completed. */
    @Query("select max(s.score) from AssessmentSession s where s.user.id = :userId "
            + "and s.section = :section and s.level = :level and s.status = 'COMPLETED'")
    Double findBestScore(Long userId, Section section, int level);

    // ---- team-wide batches (one query for a whole team, not one per employee) ----

    /**
     * Every completed attempt at one level for a set of users, oldest first. The manager
     * team table groups these in memory to get attempts-used and latest score per section,
     * replacing three queries per employee with one for the table.
     */
    @Query("select s from AssessmentSession s where s.user.id in :userIds and s.level = :level "
            + "and s.status = 'COMPLETED' order by s.createdAt asc")
    List<AssessmentSession> findCompletedByUsersAndLevel(Collection<Long> userIds, int level);

    /**
     * Best completed score per (user, section) at one level — resolves the Level 2 gate for
     * a whole team in one aggregate instead of three {@link #findBestScore} calls each.
     * Each row is {@code [Long userId, Section section, Double bestScore]}.
     */
    @Query("select s.user.id, s.section, max(s.score) from AssessmentSession s "
            + "where s.user.id in :userIds and s.level = :level and s.status = 'COMPLETED' "
            + "group by s.user.id, s.section")
    List<Object[]> findBestScoresByUsersAndLevel(Collection<Long> userIds, int level);

    /** Speaking sets this user has been served at one level. */
    @Query("select distinct s.speakingSetNumber from AssessmentSession s "
            + "where s.user.id = :userId and s.level = :level and s.speakingSetNumber is not null")
    List<Integer> findSpeakingSetsUsedByUserAndLevel(Long userId, int level);

    /** For each speaking set served at one level, the most recent time it was served. */
    @Query("select s.speakingSetNumber, max(s.createdAt) from AssessmentSession s "
            + "where s.level = :level and s.speakingSetNumber is not null group by s.speakingSetNumber")
    List<Object[]> findSpeakingSetUsageByLevel(int level);
}
