package com.cloudfuze.trainer.service;

import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.domain.SessionStatus;
import com.cloudfuze.trainer.dto.SectionScoreResponse;
import com.cloudfuze.trainer.dto.speaking.SpeakingDtos;
import com.cloudfuze.trainer.entity.AssessmentSession;
import com.cloudfuze.trainer.entity.SpeakingSentence;
import com.cloudfuze.trainer.entity.User;
import com.cloudfuze.trainer.service.ai.AiService;
import com.cloudfuze.trainer.service.ai.AzureSpeechService;
import com.cloudfuze.trainer.service.ai.SpeakingEvaluation;
import com.cloudfuze.trainer.service.ai.SpeechAssessment;
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
    private final AzureSpeechService azureSpeechService;
    private final JsonUtil json;
    private final AuditService auditService;
    private final com.cloudfuze.trainer.repository.SpeakingRecordingRepository recordingRepository;
    private final com.cloudfuze.trainer.repository.AssessmentSessionRepository sessionRepository;

    public SpeakingService(SpeakingSetService speakingSetService, SessionService sessionService,
                           AiService aiService, AzureSpeechService azureSpeechService,
                           JsonUtil json, AuditService auditService,
                           com.cloudfuze.trainer.repository.SpeakingRecordingRepository recordingRepository,
                           com.cloudfuze.trainer.repository.AssessmentSessionRepository sessionRepository) {
        this.speakingSetService = speakingSetService;
        this.sessionService = sessionService;
        this.aiService = aiService;
        this.azureSpeechService = azureSpeechService;
        this.json = json;
        this.auditService = auditService;
        this.recordingRepository = recordingRepository;
        this.sessionRepository = sessionRepository;
    }

    /** Scores one spoken sentence via Azure → OpenAI-audio → transcript fallback. */
    private SpeakingDtos.SpeechItem scoreSentence(SpeakingDtos.SpeechResultInput input) {
        String expected = input.expected() == null ? "" : input.expected();
        String transcript = input.transcript() == null ? "" : input.transcript();
        SpeakingEvaluation eval = null;

        byte[] audio = decodeAudio(input.audioBase64());
        if (audio != null && azureSpeechService.isEnabled()) {
            SpeechAssessment a = azureSpeechService.assess(audio, expected);
            if (a != null) {
                eval = fromAzure(a);
                if (a.recognizedText() != null && !a.recognizedText().isBlank()) {
                    transcript = a.recognizedText();
                }
            }
        }
        if (eval == null) {
            String rawB64 = rawBase64(input.audioBase64());
            if (rawB64 != null) {
                eval = aiService.scoreSpeakingFromAudio(expected, rawB64);
            }
        }
        if (eval == null) {
            eval = aiService.scoreSpeaking(expected, transcript);
        }
        return new SpeakingDtos.SpeechItem(expected, transcript, eval, false);
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
    public SpeakingDtos.StartResponse start(User user) {
        AssessmentSession session = sessionService.getOrCreateActiveSection(user, Section.SPEAKING);
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
                    scored.expected(), scored.transcript(), scored.evaluation(), hasAudio));
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

    /** Maps Azure pronunciation scores onto the app's speaking rubric. */
    private SpeakingEvaluation fromAzure(SpeechAssessment a) {
        double round = 10.0;
        double pronunciation = Math.round(a.accuracy() * round) / round;   // phoneme accuracy
        double fluency = Math.round(a.fluency() * round) / round;
        double accuracy = Math.round(a.completeness() * round) / round;      // said the whole sentence
        double overall = Math.round(a.pronunciation() * round) / round;      // Azure calibrated overall
        List<String> tips = new ArrayList<>();
        if (a.accuracy() < 80) tips.add("Focus on clearer pronunciation of each word.");
        if (a.fluency() < 80) tips.add("Speak more smoothly, with fewer pauses.");
        if (a.completeness() < 90) tips.add("Say the complete sentence — some words were missed.");
        if (tips.isEmpty()) tips.add("Excellent spoken delivery.");
        return new SpeakingEvaluation(pronunciation, accuracy, fluency, pronunciation, pronunciation,
                fluency, overall, tips);
    }
}
