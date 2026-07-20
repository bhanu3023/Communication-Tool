package com.cloudfuze.trainer.repository;

import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.entity.SectionAttemptControl;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SectionAttemptControlRepository extends JpaRepository<SectionAttemptControl, Long> {

    Optional<SectionAttemptControl> findByUserIdAndSection(Long userId, Section section);

    List<SectionAttemptControl> findByUserId(Long userId);
}
