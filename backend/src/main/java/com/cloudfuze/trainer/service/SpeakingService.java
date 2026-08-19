package com.cloudfuze.trainer.service;

import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.domain.SessionStatus;
import com.cloudfuze.trainer.dto.SectionScoreResponse;
import com.cloudfuze.trainer.dto.speaking.SpeakingDtos;
import com.cloudfuze.trainer.entity.AssessmentSession;
import com.cloudfuze.trainer.entity.SpeakingRecording;
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

    // 15 minutes for the section. There is no per-sentence timer -- QUESTION_SECONDS is sent to
    // the client but the UI deliberately does not run it -- so this single budget is the only
    // pressure on the candidate. It was 10 minutes when a Level 2 set totalled about 150 words;
    // the set now runs to roughly 300 (one sentence of 14 words building to one of 57), which is
    // close to three minutes of speech before anyone reads a line silently or re-records a take.
    // Ten minutes would have turned a content change into a time trial.
    private static final int OVERALL_SECONDS = 900;   // 15 minutes total
    private static final int QUESTION_SECONDS = 60;   // advisory only; the UI runs no per-sentence timer
    /** A bare WAV header is 44 bytes, so anything this small carries no audio at all. */
    private static final int EMPTY_AUDIO_BYTES = 44;

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

    /**
     * Scores one spoken sentence against what its recording was heard to say.
     *
     * <p>The take was already uploaded and transcribed mid-test, so the text used here is the
     * SAME text the candidate was shown before they moved on. Re-transcribing at submit time
     * would pay for the same audio twice and could return slightly different words for one
     * recording, so a candidate could be graded on something they never saw.
     *
     * <p>The client no longer supplies any transcript. It used to send the browser's live
     * recognition, which is Chrome-only, drops the opening words, and is whatever the caller
     * chose to put in the field — a forged one plus unusable audio was a route to full marks
     * without speaking. The recording is the only evidence now.
     *
     * @param index zero-based position of this sentence, which is how the stored take is found
     */
    private SpeakingDtos.SpeechItem scoreSentence(Long sessionId, int index,
                                                  SpeakingDtos.SpeechResultInput input) {
        // Never trust the client's "expected" text — resolve the reference sentence from the
        // database by id, so a caller cannot send expected == transcript for a perfect score.
        String expected = sentenceRepository.findById(input.sentenceId())
                .map(SpeakingSentence::getText)
                .orElse("");

        SpeakingRecording stored = recordingRepository
                .findBySessionIdAndSentenceIndex(sessionId, index)
                .orElse(null);
        if (stored == null || stored.getAudio() == null || stored.getAudio().length <= EMPTY_AUDIO_BYTES) {
            // No usable recording reached us for this sentence. That is an unanswered question,
            // not an outage: score it as nothing said.
            SpeakingEvaluation none = aiService.scoreSpeaking(expected, "");
            return new SpeakingDtos.SpeechItem(expected, "", none, false, false);
        }

        String transcript = stored.getTranscript();
        boolean transcriptionFailed = false;
        if (transcript == null) {
            // The take was stored but never transcribed — its upload landed while transcription
            // was down. Try once more here rather than scoring a recording nobody has listened to.
            Transcription heard = aiService.transcribe(stored.getAudio(), stored.getMimeType());
            if (heard.assessed()) {
                transcript = heard.text();
                stored.setTranscript(transcript);
                recordingRepository.save(stored);
            } else {
                // Still down. This is our failure, not theirs, so it must read as "could not be
                // processed" rather than as silence — and it must not quietly score them zero.
                transcript = "";
                transcriptionFailed = true;
            }
        }

        SpeakingEvaluation eval = aiService.scoreSpeaking(expected, transcript);
        String shown = transcriptionFailed ? "" : transcript;
        return new SpeakingDtos.SpeechItem(expected, shown, eval, true, transcriptionFailed);
    }


    /**
     * Returns the stored WAV bytes for one sentence of an attempt. Access is limited to
     * the session's owner or any manager.
     */
    @Transactional(readOnly = true)
    public SpeakingRecording recording(User user, Long sessionId, int index) {
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
                .orElseThrow(() -> new com.cloudfuze.trainer.exception.ResourceNotFoundException(
                        "No recording for this sentence"));
    }

    /**
     * Stores one take and transcribes it immediately, mid-test.
     *
     * <p>This is what the candidate is shown after they press stop: the words the TRANSCRIBER
     * heard in their own recording, while they can still re-record. It replaces the browser's
     * live speech recognition, which reported something different from what was actually scored
     * — it drops the opening words while the microphone is still coming up, exists only on
     * Chrome, and is whatever the caller chose to send. Showing the candidate one text and
     * grading another was indefensible; now there is a single text and it is the graded one.
     *
     * <p>The transcript is kept on the recording row so scoring reuses it. Transcribing the same
     * audio twice would double the cost per attempt and could return two different texts for one
     * recording, which is the confusion this change exists to remove.
     *
     * <p>A take that cannot be transcribed is still stored. The audio is the evidence, and an
     * outage on our side must not cost the candidate their answer.
     */
    @Transactional
    public SpeakingDtos.TakeResponse recordTake(User user, SpeakingDtos.TakeRequest request) {
        AssessmentSession session = sessionService.requireOwnedActiveSession(user, request.sessionId());
        byte[] audio = decodeAudio(request.audioBase64());
        if (audio == null || audio.length <= EMPTY_AUDIO_BYTES) {
            // Nothing usable arrived. Say so plainly rather than storing an empty file that
            // would later be graded as silence.
            return new SpeakingDtos.TakeResponse("", false, false);
        }

        SpeakingRecording rec = recordingRepository
                .findBySessionIdAndSentenceIndex(session.getId(), request.sentenceIndex())
                .orElseGet(com.cloudfuze.trainer.entity.SpeakingRecording::new);
        rec.setSessionId(session.getId());
        rec.setSentenceIndex(request.sentenceIndex());
        rec.setAudio(audio);
        rec.setMimeType(request.mimeType());

        Transcription heard = aiService.transcribe(audio, request.mimeType());
        // Null (never transcribed) and "" (transcribed, nothing said) mean different things at
        // scoring time, so only write the text when the recording was actually assessed.
        rec.setTranscript(heard.assessed() ? heard.text() : null);
        recordingRepository.save(rec);

        auditService.log(user.getEmail(), "SPEAKING_TAKE",
                "session=" + session.getId() + " index=" + request.sentenceIndex()
                        + " bytes=" + audio.length + " assessed=" + heard.assessed());
        return new SpeakingDtos.TakeResponse(heard.text(), heard.assessed(), true);
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
            // Each take was uploaded and transcribed the moment the candidate stopped recording,
            // so there is nothing to store here and nothing to transcribe -- this reads what is
            // already on disk. It also means a submit no longer carries several megabytes of
            // audio, which is what used to make it the slowest, most failure-prone request in
            // the app.
            items.add(scoreSentence(session.getId(), index, input));
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
