package com.cloudfuze.trainer.service;

import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.domain.SessionStatus;
import com.cloudfuze.trainer.dto.SectionScoreResponse;
import com.cloudfuze.trainer.dto.speaking.SpeakingDtos;
import com.cloudfuze.trainer.entity.AssessmentSession;
import com.cloudfuze.trainer.entity.SpeakingSentence;
import com.cloudfuze.trainer.entity.User;
import com.cloudfuze.trainer.repository.SpeakingSentenceRepository;
import com.cloudfuze.trainer.service.ai.AiService;
import com.cloudfuze.trainer.service.ai.SpeakingEvaluation;
import com.cloudfuze.trainer.service.ai.Transcription;
import com.cloudfuze.trainer.util.JsonUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class SpeakingService {

    private static final int OVERALL_SECONDS = 600;   // 10 minutes total
    private static final int QUESTION_SECONDS = 60;   // 60 seconds each (10 × 60s = 10 min)

    private final SpeakingSetService speakingSetService;
    private final SessionService sessionService;
    private final AiService aiService;
    private final JsonUtil json;
    private final AuditService auditService;
    private final com.cloudfuze.trainer.repository.SpeakingRecordingRepository recordingRepository;
    private final com.cloudfuze.trainer.repository.AssessmentSessionRepository sessionRepository;
    private final SpeakingSentenceRepository sentenceRepository;

    public SpeakingService(SpeakingSetService speakingSetService, SessionService sessionService,
                           AiService aiService,
                           JsonUtil json, AuditService auditService,
                           com.cloudfuze.trainer.repository.SpeakingRecordingRepository recordingRepository,
                           com.cloudfuze.trainer.repository.AssessmentSessionRepository sessionRepository,
                           SpeakingSentenceRepository sentenceRepository) {
        this.speakingSetService = speakingSetService;
        this.sessionService = sessionService;
        this.aiService = aiService;
        this.json = json;
        this.auditService = auditService;
        this.recordingRepository = recordingRepository;
        this.sessionRepository = sessionRepository;
        this.sentenceRepository = sentenceRepository;
    }

    /** Scores one spoken sentence: transcribe the recording, then grade that transcript. */
    private SpeakingDtos.SpeechItem scoreSentence(SpeakingDtos.SpeechResultInput input) {
        // Never trust the client's "expected" text — resolve the reference sentence from
        // the database by id, so a caller can't send expected == transcript for a perfect
        // score. The transcript is still client-supplied, but it is what gets graded.
        String expected = sentenceRepository.findById(input.sentenceId())
                .map(SpeakingSentence::getText)
                .orElse("");
        String transcript = input.transcript() == null ? "" : input.transcript();

        byte[] audio = decodeAudio(input.audioBase64());
        // Transcribe the recording server-side. This is the ONLY text that may be shown back to
        // anyone: the client transcript comes from the browser's Web Speech API, which drops the
        // opening words while the mic is still coming up, is Chrome-only, and can be set to
        // anything by whoever calls the endpoint. It exists so the candidate sees something
        // while they speak, and for nothing else.
        Transcription heard = aiService.transcribe(audio);
        if (heard.assessed()) {
            // The recording was checked. Whatever it was heard to say IS the answer — including
            // nothing at all. Falling back here would score the client's transcript, which the
            // caller controls, so unusable audio plus a perfect transcript would be full marks
            // without speaking.
            transcript = heard.text();
        }
        // Only a failure on our side — no key, rate limit, timeout, a 5xx — may fall back to the
        // transcript the browser sent, so an outage cannot zero a candidate for something
        // outside their control. Feedback shows "could not be processed" rather than that text.
        boolean transcriptionFailed = heard.status() == Transcription.Status.UNAVAILABLE;
        SpeakingEvaluation eval = aiService.scoreSpeaking(expected, transcript);
        // Never hand back the browser's text. Empty + transcriptionFailed reads as "we could not
        // process your recording"; empty on its own still reads as "no speech detected".
        String shown = transcriptionFailed ? "" : transcript;
        return new SpeakingDtos.SpeechItem(expected, shown, eval, false, transcriptionFailed);
    }

    /** Persists (or replaces) one sentence's recorded audio; returns true if audio was stored. */
    private boolean storeRecording(Long sessionId, int index, String audioBase64) {
        byte[] audio = decodeAudio(audioBase64);
        if (audio == null || audio.length == 0) {
            return false;
        }
        com.cloudfuze.trainer.entity.SpeakingRecording rec = recordingRepository
                .findBySessionIdAndSentenceIndex(sessionId, index)
                .orElseGet(com.cloudfuze.trainer.entity.SpeakingRecording::new);
        rec.setSessionId(sessionId);
        rec.setSentenceIndex(index);
        rec.setAudio(audio);
        recordingRepository.save(rec);
        return true;
    }

    /**
     * Returns the stored WAV bytes for one sentence of an attempt. Access is limited to
     * the session's owner or any manager.
     */
    @Transactional(readOnly = true)
    public byte[] recording(User user, Long sessionId, int index) {
        AssessmentSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new com.cloudfuze.trainer.exception.ResourceNotFoundException(
                        "Session not found: " + sessionId));
        boolean isOwner = session.getUser().getId().equals(user.getId());
        boolean isManager = user.getRole() == com.cloudfuze.trainer.domain.Role.MANAGER;
        if (!isOwner && !isManager) {
            throw new com.cloudfuze.trainer.exception.ApiException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "You cannot access this recording");
        }
        return recordingRepository.findBySessionIdAndSentenceIndex(sessionId, index)
                .map(com.cloudfuze.trainer.entity.SpeakingRecording::getAudio)
                .orElseThrow(() -> new com.cloudfuze.trainer.exception.ResourceNotFoundException(
                        "No recording for this sentence"));
    }

    @Transactional
    public SpeakingDtos.StartResponse start(User user, int level) {
        AssessmentSession session = sessionService.getOrCreateActiveSection(user, Section.SPEAKING, level);
        // Each attempt gets a different set of 10 sentences (never the user's own repeats).
        List<SpeakingSentence> sentences = speakingSetService.sentencesForSession(user, session);
        List<SpeakingDtos.SentenceView> views = new ArrayList<>();
        int i = 1;
        for (SpeakingSentence s : sentences) {
            views.add(new SpeakingDtos.SentenceView(s.getId(), i++, s.getText()));
        }
        auditService.log(user.getEmail(), "SPEAKING_START", "session=" + session.getId());
        return new SpeakingDtos.StartResponse(
                session.getId(), session.getAttemptNumber(), OVERALL_SECONDS, QUESTION_SECONDS, views);
    }

    @Transactional
    public SectionScoreResponse submit(User user, SpeakingDtos.SubmitRequest request) {
        AssessmentSession session = sessionService.requireOwnedActiveSession(user, request.sessionId());

        // Score each sentence sequentially (avoids OpenAI concurrency issues) and persist
        // its audio so it can be replayed later from the dashboard / manager portal.
        List<SpeakingDtos.SpeechItem> items = new ArrayList<>();
        int index = 0;
        for (SpeakingDtos.SpeechResultInput input : request.results()) {
            SpeakingDtos.SpeechItem scored = scoreSentence(input);
            boolean hasAudio = storeRecording(session.getId(), index, input.audioBase64());
            items.add(new SpeakingDtos.SpeechItem(
                    scored.expected(), scored.transcript(), scored.evaluation(), hasAudio,
                    scored.transcriptionFailed()));
            index++;
        }
        double total = items.stream().mapToDouble(it -> it.evaluation().overall()).sum();
        double score = items.isEmpty() ? 0 : Math.round((total / items.size()) * 10.0) / 10.0;

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("items", items);
        details.put("average", score);

        sessionService.completeSection(
                session, Section.SPEAKING, score, json.toJson(details), json.toJson(details));
        auditService.log(user.getEmail(), "SPEAKING_SUBMIT", "session=" + session.getId() + " score=" + score);

        return new SectionScoreResponse("SPEAKING", score, true, null, details, details);
    }

    /** Strips an optional data-URL prefix and returns the raw base64 payload. */
    private String rawBase64(String base64) {
        if (base64 == null || base64.isBlank()) return null;
        return base64.contains(",") ? base64.substring(base64.indexOf(',') + 1) : base64;
    }

    private byte[] decodeAudio(String base64) {
        String payload = rawBase64(base64);
        if (payload == null) return null;
        try {
            return Base64.getDecoder().decode(payload);
        } catch (Exception e) {
            return null;
        }
    }

}
