package com.cloudfuze.trainer.service;

import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.dto.SectionScoreResponse;
import com.cloudfuze.trainer.dto.listening.ListeningDtos;
import com.cloudfuze.trainer.entity.AssessmentSession;
import com.cloudfuze.trainer.entity.ListeningQuestion;
import com.cloudfuze.trainer.entity.ListeningStory;
import com.cloudfuze.trainer.entity.User;
import com.cloudfuze.trainer.repository.ListeningQuestionRepository;
import com.cloudfuze.trainer.service.ai.AiService;
import com.cloudfuze.trainer.service.ai.ListeningSummary;
import com.cloudfuze.trainer.util.JsonUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ListeningService {

    private static final int QUESTION_COUNT = 10;
    private static final int ANSWERING_SECONDS = 300; // 5 minutes to answer, starts after the audio
    private static final int MARKS_PER_QUESTION = 10;

    // Narration-time estimate for the story audio (browser speech synthesis). A
    // deliberately generous ~120 words/minute + buffer so the countdown never cuts
    // the audio short; it doubles as a safety cap if playback stalls.
    private static final double WORDS_PER_SECOND = 2.0;
    private static final int AUDIO_BUFFER_SECONDS = 10;
    private static final int MIN_AUDIO_SECONDS = 45;
    private static final int MAX_AUDIO_SECONDS = 300;

    private final ContentService contentService;
    private final SessionService sessionService;
    private final ListeningQuestionRepository questionRepository;
    private final AiService aiService;
    private final JsonUtil json;
    private final AuditService auditService;

    public ListeningService(ContentService contentService, SessionService sessionService,
                            ListeningQuestionRepository questionRepository, AiService aiService,
                            JsonUtil json, AuditService auditService) {
        this.contentService = contentService;
        this.sessionService = sessionService;
        this.questionRepository = questionRepository;
        this.aiService = aiService;
        this.json = json;
        this.auditService = auditService;
    }

    @Transactional
    public ListeningDtos.StartResponse start(User user) {
        AssessmentSession session = sessionService.getOrCreateActiveSection(user, Section.LISTENING);
        ListeningStory story = contentService.randomStory();
        List<ListeningQuestion> questions = questionRepository.findByStoryIdOrderByOrdinalAsc(story.getId());

        List<ListeningDtos.QuestionView> views = new ArrayList<>();
        int i = 1;
        for (ListeningQuestion q : questions) {
            views.add(new ListeningDtos.QuestionView(q.getId(), i++, q.getQuestionText(),
                    q.getOptionA(), q.getOptionB(), q.getOptionC(), q.getOptionD()));
        }
        auditService.log(user.getEmail(), "LISTENING_START",
                "session=" + session.getId() + " story=" + story.getId());
        return new ListeningDtos.StartResponse(session.getId(), session.getAttemptNumber(),
                story.getTitle(), story.getScript(),
                estimateAudioSeconds(story.getScript()), ANSWERING_SECONDS, views);
    }

    /** Estimates how long the narration will take to play, clamped to a sane range. */
    private int estimateAudioSeconds(String script) {
        if (script == null || script.isBlank()) return MIN_AUDIO_SECONDS;
        int words = script.trim().split("\\s+").length;
        int estimate = (int) Math.ceil(words / WORDS_PER_SECOND) + AUDIO_BUFFER_SECONDS;
        return Math.max(MIN_AUDIO_SECONDS, Math.min(MAX_AUDIO_SECONDS, estimate));
    }

    @Transactional
    public SectionScoreResponse submit(User user, ListeningDtos.SubmitRequest request) {
        AssessmentSession session = sessionService.requireOwnedActiveSession(user, request.sessionId());

        List<ListeningDtos.AnswerResult> results = new ArrayList<>();
        int correct = 0;
        for (ListeningDtos.AnswerSubmission answer : request.answers()) {
            ListeningQuestion q = questionRepository.findById(answer.questionId()).orElse(null);
            if (q == null) continue;
            boolean isCorrect = q.getCorrectOption().equalsIgnoreCase(answer.selectedOption());
            if (isCorrect) correct++;
            results.add(new ListeningDtos.AnswerResult(q.getId(), q.getQuestionText(),
                    answer.selectedOption(), q.getCorrectOption(), isCorrect));
        }

        double score = correct * MARKS_PER_QUESTION;
        ListeningSummary summary = aiService.summarizeListening(correct, QUESTION_COUNT);

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("correctCount", correct);
        details.put("wrongCount", QUESTION_COUNT - correct);
        details.put("total", QUESTION_COUNT);
        details.put("answers", results);
        details.put("summary", summary);

        sessionService.completeSection(
                session, Section.LISTENING, score, json.toJson(details), json.toJson(summary));
        auditService.log(user.getEmail(), "LISTENING_SUBMIT", "session=" + session.getId() + " score=" + score);

        return new SectionScoreResponse("LISTENING", score, true, null, summary, details);
    }
}
