package com.cloudfuze.trainer.repository;

import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.entity.SectionResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SectionResultRepository extends JpaRepository<SectionResult, Long> {

    List<SectionResult> findBySessionId(Long sessionId);

    Optional<SectionResult> findBySessionIdAndSection(Long sessionId, Section section);

    // Explicit underscore traversal: SectionResult -> session -> user -> id
    List<SectionResult> findBySession_User_IdAndSection(Long userId, Section section);
}
