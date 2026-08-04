package com.cloudfuze.trainer.repository;

import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.entity.SectionAttemptControl;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SectionAttemptControlRepository extends JpaRepository<SectionAttemptControl, Long> {

    Optional<SectionAttemptControl> findByUserIdAndSectionAndLevel(Long userId, Section section, int level);

    List<SectionAttemptControl> findByUserId(Long userId);

    /** Controls for a whole team at one level, so the team table reads them in one query. */
    List<SectionAttemptControl> findByUserIdInAndLevel(Collection<Long> userIds, int level);
}
