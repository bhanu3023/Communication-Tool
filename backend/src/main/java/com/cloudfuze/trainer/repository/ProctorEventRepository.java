package com.cloudfuze.trainer.repository;

import com.cloudfuze.trainer.entity.ProctorEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ProctorEventRepository extends JpaRepository<ProctorEvent, Long> {
    List<ProctorEvent> findBySession_User_IdOrderByCreatedAtDesc(Long userId);

    /**
     * One employee's warnings at one level, with the session joined in. Callers read
     * {@code session.attemptNumber}/{@code section}, and {@code session} is LAZY — without
     * the fetch that is one extra query per warning row.
     */
    @Query("select e from ProctorEvent e join fetch e.session s "
            + "where s.user.id = :userId and s.level = :level order by e.createdAt desc")
    List<ProctorEvent> findByUserAndLevelWithSession(Long userId, int level);

    /**
     * Warning counts per employee at one level — the whole team in a single aggregate,
     * instead of loading every event and counting them in Java per row.
     * Each row is {@code [Long userId, Long count]}.
     */
    @Query("select s.user.id, count(e) from ProctorEvent e join e.session s "
            + "where s.level = :level group by s.user.id")
    List<Object[]> countByLevelGroupedByUser(int level);
}
