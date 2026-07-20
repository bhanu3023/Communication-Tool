package com.cloudfuze.trainer.service;

import com.cloudfuze.trainer.domain.Section;
import com.cloudfuze.trainer.domain.SessionStatus;
import com.cloudfuze.trainer.dto.SectionScoreResponse;
import com.cloudfuze.trainer.dto.writing.WritingDtos;
import com.cloudfuze.trainer.entity.AssessmentSession;
import com.cloudfuze.trainer.entity.User;
import com.cloudfuze.trainer.entity.WritingPrompt;
import com.cloudfuze.trainer.exception.ResourceNotFoundException;
import com.cloudfuze.trainer.repository.WritingPromptRepository;
import com.cloudfuze.trainer.service.ai.AiService;
import com.cloudfuze.trainer.service.ai.WritingEvaluation;
import com.cloudfuze.trainer.util.JsonUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class WritingService {

    // A short structure/outline shown to the candidate so they know how to lay out each message.
    private static final Map<String, List<String>> OUTLINES = Map.ofEntries(
            Map.entry("Customer Email", List.of(
                    "Greeting — e.g. \"Hi Priya,\"",
                    "Acknowledge their concern in one line",
                    "Explain what happened and what you are doing",
                    "Give a clear ETA or the next steps",
                    "Apologise if it was our fault, and reassure them",
                    "Professional closing + your name")),
            Map.entry("Internal Escalation", List.of(
                    "Flag it clearly (urgent / priority-one)",
                    "What is broken and who is affected",
                    "What you have found so far, if anything",
                    "Exactly what you need, and by when")),
            Map.entry("Incident Report", List.of(
                    "One-line summary of what happened",
                    "Timeline (start → end)",
                    "Root cause",
                    "Impact (who / how many affected)",
                    "Remediation taken + how you will prevent it")),
            Map.entry("Status Update", List.of(
                    "Completed this week",
                    "In progress",
                    "Blockers or help needed")),
            Map.entry("Slack Message", List.of(
                    "What is happening",
                    "When / how long",
                    "What people should do (if anything)")),
            Map.entry("Handover", List.of(
                    "Each active item and its current status",
                    "What to watch for",
                    "Who to contact if needed")),
            Map.entry("Feedback", List.of(
                    "What they did well",
                    "Specific improvement 1",
                    "Specific improvement 2",
                    "Encouraging close")),
            Map.entry("Meeting Summary", List.of(
                    "Key decisions made",
                    "Action items with owners",
                    "Risks or follow-ups")),
            Map.entry("Vendor Escalation", List.of(
                    "The impact on you / the customer",
                    "Request an urgent status update",
                    "Ask for a firm resolution time")),
            Map.entry("Proposal", List.of(
                    "The problem",
                    "Your proposed change",
                    "Expected benefits",
                    "Ask for approval / next step")),
            Map.entry("Documentation", List.of(
                    "The problem it solves",
                    "Step-by-step fix",
                    "Any warnings or notes")),
            Map.entry("Announcement", List.of(
                    "What is changing",
                    "When it starts",
                    "Why it matters / the benefit",
                    "Where to find full details")),
            Map.entry("Stand-up", List.of(
                    "Yesterday",
                    "Today",
                    "Blockers")));
    private static final List<String> DEFAULT_OUTLINE = List.of(
            "Clear opening", "Key details and context", "Your main point or request", "Professional closing");

    private static final int THINKING_SECONDS = 120;  // 2 minutes to read & plan before writing
    private static final int OVERALL_SECONDS = 720;   // 12 minutes of writing
    private static final int QUESTION_SECONDS = 360;  // 6 minutes each (2 tasks) → 14 min total with thinking
    private static final int EMAIL_MIN_WORDS = 60;    // a complete customer email
    private static final int OTHER_MIN_WORDS = 40;    // a complete internal message

    private final ContentService contentService;
    private final SessionService sessionService;
    private final WritingPromptRepository promptRepository;
    private final AiService aiService;
    private final JsonUtil json;
    private final AuditService auditService;

    public WritingService(ContentService contentService, SessionService sessionService,
                          WritingPromptRepository promptRepository, AiService aiService,
                          JsonUtil json, AuditService auditService) {
        this.contentService = contentService;
        this.sessionService = sessionService;
        this.promptRepository = promptRepository;
        this.aiService = aiService;
        this.json = json;
        this.auditService = auditService;
    }

    @Transactional
    public WritingDtos.StartResponse start(User user) {
        AssessmentSession session = sessionService.getOrCreateActiveSection(user, Section.WRITING);
        // Prompt 1 is always a customer email; prompt 2 is a varied task.
        List<WritingPrompt> prompts = contentService.writingPrompts();
        List<WritingDtos.PromptView> views = new ArrayList<>();
        int i = 1;
        for (WritingPrompt p : prompts) {
            int minWords = ContentService.EMAIL_CATEGORY.equalsIgnoreCase(p.getCategory())
                    ? EMAIL_MIN_WORDS : OTHER_MIN_WORDS;
            List<String> outline = OUTLINES.getOrDefault(p.getCategory(), DEFAULT_OUTLINE);
            views.add(new WritingDtos.PromptView(p.getId(), i++, p.getCategory(), p.getPrompt(), minWords, outline));
        }
        auditService.log(user.getEmail(), "WRITING_START", "session=" + session.getId());
        return new WritingDtos.StartResponse(
                session.getId(), session.getAttemptNumber(), THINKING_SECONDS, OVERALL_SECONDS, QUESTION_SECONDS, views);
    }

    /** Auto-save is fire-and-forget; drafts are not scored. Validates ownership only. */
    @Transactional
    public void saveDraft(User user, WritingDtos.SaveDraftRequest request) {
        sessionService.requireOwnedActiveSession(user, request.sessionId());
        auditService.log(user.getEmail(), "WRITING_AUTOSAVE",
                "session=" + request.sessionId() + " prompt=" + request.promptId());
    }

    @Transactional
    public SectionScoreResponse submit(User user, WritingDtos.SubmitRequest request) {
        AssessmentSession session = sessionService.requireOwnedActiveSession(user, request.sessionId());

        // Score each answer sequentially (avoids OpenAI concurrency issues).
        List<WritingDtos.WritingItem> items = new ArrayList<>();
        for (WritingDtos.AnswerInput answer : request.answers()) {
            WritingPrompt prompt = promptRepository.findById(answer.promptId())
                    .orElseThrow(() -> new ResourceNotFoundException("Prompt not found: " + answer.promptId()));
            items.add(scorePrompt(prompt, answer));
        }
        double total = items.stream().mapToDouble(it -> it.evaluation().overall()).sum();
        double score = items.isEmpty() ? 0 : Math.round((total / items.size()) * 10.0) / 10.0;

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("items", items);
        details.put("average", score);

        sessionService.completeSection(
                session, Section.WRITING, score, json.toJson(details), json.toJson(details));
        auditService.log(user.getEmail(), "WRITING_SUBMIT", "session=" + session.getId() + " score=" + score);

        return new SectionScoreResponse("WRITING", score, true, null, details, details);
    }

    /** Scores one writing answer (AI rubric + integrity) — safe to run in parallel. */
    private WritingDtos.WritingItem scorePrompt(WritingPrompt prompt, WritingDtos.AnswerInput answer) {
        String content = answer.content() == null ? "" : answer.content();
        WritingEvaluation eval = aiService.scoreWriting(prompt.getCategory(), prompt.getPrompt(), content);
        WritingDtos.WritingIntegrity integrity = assessIntegrity(content, answer);
        return new WritingDtos.WritingItem(prompt.getCategory(), prompt.getPrompt(), content, eval, integrity);
    }

    /**
     * Combines typing telemetry (strong signal — paste is blocked in the UI) with a
     * content AI-likelihood estimate into a human-readable integrity verdict.
     */
    private WritingDtos.WritingIntegrity assessIntegrity(String content, WritingDtos.AnswerInput answer) {
        int chars = content.length();
        int words = content.isBlank() ? 0 : content.trim().split("\\s+").length;
        int keystrokes = Math.max(0, answer.keystrokes());
        double seconds = Math.max(0, answer.typingSeconds());
        double typedRatio = chars == 0 ? 0 : Math.round(((double) keystrokes / chars) * 100.0) / 100.0;
        double wpm = seconds > 0 ? Math.round((words / (seconds / 60.0)) * 10.0) / 10.0 : 0;

        double aiLikelihood = aiService.detectAiLikelihood(content).aiLikelihood();

        List<String> flags = new ArrayList<>();
        if (chars > 40 && typedRatio < 0.6) {
            flags.add("Very few keystrokes for the text length — content may not have been typed here.");
        }
        if (wpm > 120) {
            flags.add("Unusually fast typing (" + wpm + " wpm) — possible transcription from another source.");
        }
        if (words > 60 && answer.backspaces() == 0) {
            flags.add("A long response with no edits — possible transcription.");
        }
        if (aiLikelihood >= 70) {
            flags.add("Writing style strongly resembles AI-generated text.");
        }
        String verdict = flags.isEmpty()
                ? "Consistent with genuine, self-typed work."
                : String.join(" ", flags);

        return new WritingDtos.WritingIntegrity(
                keystrokes, Math.max(0, answer.backspaces()), Math.round(seconds * 10.0) / 10.0,
                chars, typedRatio, wpm, aiLikelihood, verdict);
    }
}
