package com.cloudfuze.trainer.repository;

import com.cloudfuze.trainer.entity.SpeakingRecording;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SpeakingRecordingRepository extends JpaRepository<SpeakingRecording, Long> {

    Optional<SpeakingRecording> findBySessionIdAndSentenceIndex(Long sessionId, int sentenceIndex);

    void deleteBySessionId(Long sessionId);
}
