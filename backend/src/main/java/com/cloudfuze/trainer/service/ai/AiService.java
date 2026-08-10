package com.cloudfuze.trainer.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Facade over AI evaluation. Uses OpenAI when configured, otherwise (or on any
 * failure) the deterministic {@link MockAiEvaluator}. Numeric weighting for
 * speaking always follows the spec rubric regardless of provider.
 */
@Service
public class AiService {

    /** Most distinct score-triples we keep coaching text for before evicting the oldest. */
    private static final int OVERALL_CACHE_MAX = 512;

    private final OpenAiClient openAi;
    private final MockAiEvaluator mock;

    /**
     * Coaching summaries keyed on the score triple they were generated from.
     *
     * The summary is a pure function of those three scores, and they only change when an
     * attempt completes — so a hit is always correct and never stale (new scores simply
     * produce a new key). Without this, every AI Coach page load spent a fresh 5-6s
     * OpenAI round-trip re-deriving identical text. Access-ordered LRU, bounded.
     */
    private final Map<String, OverallFeedback> overallCache = Collections.synchronizedMap(
            new LinkedHashMap<>(64, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, OverallFeedback> eldest) {
                    return size() > OVERALL_CACHE_MAX;
                }
            });

    public AiService(OpenAiClient openAi, MockAiEvaluator mock) {
        this.openAi = openAi;
        this.mock = mock;
    }

    public SpeakingEvaluation scoreSpeaking(String expected, String transcript) {
        // No speech -> deterministic zero, regardless of provider (don't ask the LLM to score nothing).
        if (transcript == null || transcript.isBlank()) {
            return mock.scoreSpeaking(expected, transcript);
        }
        JsonNode node = openAi.completeJson(
                "You are a STRICT but fair spoken-English examiner scoring a REPETITION task from an ASR "
                        + "transcript. Both texts below have already been lowercased with punctuation stripped, "
                        + "so there is nothing to judge there. The transcript comes from automatic speech "
                        + "recognition, which normalizes numbers (\"twenty percent\" -> \"20%\"), invents its own "
                        + "sentence breaks, and makes minor homophone slips — treat THOSE artifacts as CORRECT and "
                        + "never penalize them. "
                        + "However, DO penalize genuinely missing, added, or wrong CONTENT words versus the target. "
                        + "Use the full 0-100 range and do not inflate. Score 0-100: accuracy = how completely the "
                        + "target's words and meaning were reproduced (missing content words lower it sharply); "
                        + "grammar and vocabulary = correctness of the words as spoken. IMPORTANT: pronunciation, "
                        + "fluency and confidence CANNOT be heard from text, so give a moderate neutral estimate "
                        + "(about 60-75) and NEVER award 90+ for these on transcript alone. Return JSON numeric "
                        + "fields (0-100): pronunciation, accuracy, fluency, grammar, vocabulary, confidence, and a "
                        + "'suggestions' array of 1-3 short, specific tips.",
                "Target sentence: \"" + forComparison(expected) + "\"\n"
                        + "Recognized transcript: \"" + forComparison(transcript) + "\"");
        if (node == null) {
            return mock.scoreSpeaking(expected, transcript);
        }
        double pronunciation = num(node, "pronunciation");
        double accuracy = num(node, "accuracy");
        double fluency = num(node, "fluency");
        double grammar = num(node, "grammar");
        double vocabulary = num(node, "vocabulary");
        double confidence = num(node, "confidence");
        double overall = weightedOverall(pronunciation, accuracy, fluency, grammar, vocabulary, confidence);
        return new SpeakingEvaluation(round(pronunciation), round(accuracy), round(fluency),
                round(grammar), round(vocabulary), round(confidence), overall, strings(node, "suggestions"));
    }

    /**
     * Combines the six sub-scores into the section score.
     *
     * <p>The weighting follows what can actually be evidenced. Pronunciation, fluency and
     * confidence cannot be judged from a transcript, so the examiner prompt holds them at a
     * neutral estimate near 70 — and while they carried 55% of the grade between them, that
     * constant capped a FLAWLESS answer at about 83.5. Level 2 passes at 80, so a perfect
     * candidate cleared it by 3.5 points and a single misheard word failed them. The bar was not
     * strict, it was barely reachable.
     *
     * <p>Weight now sits on accuracy — did they say the target's words — with grammar and
     * vocabulary secondary, and the three unmeasurable dimensions kept at a token 10% so they
     * still appear in feedback without deciding the outcome. A flawless answer now scores about
     * 97, so 75 and 80 become real bars rather than near-impossible ones.
     *
     * <p>If real pronunciation scoring is ever restored (it needs a service that hears the
     * voice), these weights should move back toward the original rubric.
     */
    static double weightedOverall(double pronunciation, double accuracy, double fluency,
                                  double grammar, double vocabulary, double confidence) {
        return round(accuracy * 0.60
                + grammar * 0.15
                + vocabulary * 0.15
                + pronunciation * 0.05
                + fluency * 0.03
                + confidence * 0.02);
    }

    /**
     * Lowercased, punctuation-free form used ONLY when comparing a spoken answer to its target.
     *
     * <p>A candidate cannot pronounce a comma, so they must not lose marks for one. Whisper
     * writes its own punctuation and sentence breaks, so "Fantastic, data moved!" came back as
     * "Fantastic. Data moved." and the examiner model docked accuracy for the difference —
     * purely an artifact of the transcriber. Normalising both sides removes the signal instead
     * of asking the model to overlook it. Never use this for anything shown to a user: feedback
     * quotes the transcript as it was heard.
     */
    private static String forComparison(String text) {
        if (text == null) {
            return "";
        }
        return text.toLowerCase(Locale.ROOT)
                // Keep letters, digits and spaces; anything else becomes a space so that
                // "well-managed" reads as two words rather than collapsing into one.
                .replaceAll("[^\\p{IsAlphabetic}\\p{IsDigit}]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    /**
     * Transcribes recorded speech server-side. The returned {@link Transcription} says whether
     * the recording was actually assessed, so the caller can tell "they said nothing" apart from
     * "we could not check" — only the latter may fall back to the client-supplied transcript.
     *
     * @param wav raw WAV bytes as stored for the sentence
     */
    public Transcription transcribe(byte[] wav) {
        return openAi.transcribe(wav);
    }

    /**
     * Scores speaking from the actual recorded audio using OpenAI's audio model.
     * Returns null if audio scoring is unavailable (no key / error) so the caller
     * can fall back to transcript-based scoring.
     *
     * <p><strong>Currently unused.</strong> gpt-audio-mini and gpt-audio accept an input_audio
     * part and answer 200, but the audio never reaches the model — asked only to transcribe,
     * both reply "please provide the audio" — so this returned prose instead of JSON and every
     * sentence fell through to transcript scoring anyway. {@link #transcribe} replaced it in the
     * scoring path. Kept because the call is correct per the API docs and costs nothing while
     * uncalled; re-enable it if OpenAI ships working audio input on chat completions.
     */
    public SpeakingEvaluation scoreSpeakingFromAudio(String expected, String base64Wav) {
        JsonNode node = openAi.completeJsonWithAudio(
                "You are a STRICT but fair spoken-English examiner assessing a repetition task. Listen to the "
                        + "candidate's actual audio and compare it to the TARGET sentence. Score HONESTLY and use "
                        + "the FULL 0-100 range — do NOT inflate. Calibrate to these bands: 90-100 near-native, "
                        + "clear and fluent; 75-89 good with minor issues; 60-74 understandable with noticeable "
                        + "issues; 40-59 effortful to understand; 20-39 poor / mostly unclear or wrong; 0-19 "
                        + "silent, unintelligible, or the wrong sentence. Judge each field 0-100 from EVIDENCE in "
                        + "the audio: pronunciation = correct sounds, word clarity and stress; accuracy = whether "
                        + "the target's words and meaning were actually said (dropped, added or wrong words lower "
                        + "it); fluency = smoothness, natural pace, few hesitations/fillers/long pauses; grammar = "
                        + "correctness of what was spoken; vocabulary = correct words matching the target; "
                        + "confidence = steady, audible, well-projected delivery. Penalize mispronounced or missing "
                        + "words, mumbling, hesitation and low audibility. Do NOT default to round numbers like 90 "
                        + "or 85 — give precise, realistic values. Return JSON numeric fields (0-100): pronunciation, "
                        + "accuracy, fluency, grammar, vocabulary, confidence, and a 'suggestions' array of 1-3 "
                        + "short, SPECIFIC tips that reference what you actually heard (e.g. a specific mispronounced "
                        + "word or a pause).",
                "Target sentence: \"" + expected + "\"",
                base64Wav);
        if (node == null) {
            return null;
        }
        double pronunciation = num(node, "pronunciation");
        double accuracy = num(node, "accuracy");
        double fluency = num(node, "fluency");
        double grammar = num(node, "grammar");
        double vocabulary = num(node, "vocabulary");
        double confidence = num(node, "confidence");
        double overall = weightedOverall(pronunciation, accuracy, fluency, grammar, vocabulary, confidence);
        return new SpeakingEvaluation(round(pronunciation), round(accuracy), round(fluency),
                round(grammar), round(vocabulary), round(confidence), overall, strings(node, "suggestions"));
    }

    public WritingEvaluation scoreWriting(String category, String prompt, String content) {
        // No response -> deterministic zero, regardless of provider.
        if (content == null || content.isBlank()) {
            return mock.scoreWriting(category, prompt, content);
        }
        JsonNode node = openAi.completeJson(
                "You are a STRICT senior business-writing examiner at a software company. The candidate was given a "
                        + "workplace SITUATION and a task (often a customer email or an internal message) and wrote a "
                        + "response. Score HONESTLY and use the FULL 0-100 range — do NOT inflate. Bands: 90-100 "
                        + "excellent, ready to send as-is; 75-89 good, minor fixes; 60-74 acceptable but with "
                        + "noticeable issues; 40-59 weak, would reflect badly on the company; 20-39 poor; 0-19 empty, "
                        + "off-topic or unusable. Score each field 0-100: grammar, spelling, clarity, vocabulary, "
                        + "tone (correct for the audience — warm and reassuring for customers, crisp and urgent for "
                        + "internal escalations), professionalism, structure (greeting / body / clear ask / closing "
                        + "where relevant), readability, conciseness, and completeness — did the response cover "
                        + "EVERYTHING the situation required (e.g. a specific ETA, the cause, next steps, an apology "
                        + "when warranted, the exact ask). HEAVILY penalize answers that omit key facts from the "
                        + "situation, use the wrong tone, are vague, or are too short; a one-line or empty answer "
                        + "scores near 0. HOUSE STYLE (this is a US-facing company, and it is marked): figures "
                        + "must group digits in THREES with commas (e.g. $1,250,000). Treat Indian-style "
                        + "grouping (12,50,000 / 1,23,456), the words lakh/lakhs/crore/crores, and any rupee "
                        + "amount (Rs., INR, the rupee sign) as CONCRETE ERRORS: list each one in 'mistakes' with "
                        + "the correct US form, and lower professionalism and clarity accordingly. CRITICAL: only "
                        + "list a figure in 'mistakes' if it ACTUALLY breaks the rule — never emit a correction "
                        + "identical to the original (e.g. never write \"1,250,000 should be 1,250,000\"). A figure "
                        + "already grouped in threes and already in dollars is CORRECT: say nothing about it. Do not default "
                        + "to round numbers. Return JSON with those numeric fields plus "
                        + "'mistakes' (array of specific errors), 'suggestions' (array of concrete, specific "
                        + "improvements), and 'improvedVersion' (a polished, ready-to-send MODEL answer that correctly "
                        + "handles this exact situation, so the candidate learns how to write it).",
                "Task type: " + category + "\nScenario & task: " + prompt + "\n\nCandidate's response:\n" + content);
        if (node == null) {
            return mock.scoreWriting(category, prompt, content);
        }
        double[] vals = {
                num(node, "grammar"), num(node, "clarity"), num(node, "vocabulary"), num(node, "tone"),
                num(node, "professionalism"), num(node, "structure"), num(node, "readability"),
                num(node, "completeness"), num(node, "spelling"), num(node, "conciseness")
        };
        double overall = 0;
        for (double v : vals) overall += v;
        overall = round(overall / vals.length);
        return new WritingEvaluation(round(vals[0]), round(vals[1]), round(vals[2]), round(vals[3]),
                round(vals[4]), round(vals[5]), round(vals[6]), round(vals[7]), round(vals[8]), round(vals[9]),
                overall, dropNoOpCorrections(strings(node, "mistakes")), strings(node, "suggestions"),
                node.path("improvedVersion").asText(""));
    }

    /** Estimates how likely the writing was AI-generated (content signal only). */
    public AiDetection detectAiLikelihood(String content) {
        if (content == null || content.isBlank()) {
            return mock.detectAi(content);
        }
        JsonNode node = openAi.completeJson(
                "You are an AI-text detector. Estimate, from 0 to 100, how likely the following text was "
                        + "written by an AI language model rather than a person. Consider uniformity, generic "
                        + "phrasing, and lack of a personal voice. Be conservative — genuine human writing can "
                        + "look polished. Return JSON: {\"aiLikelihood\": number, \"reason\": string}.",
                content);
        if (node == null) {
            return mock.detectAi(content);
        }
        return new AiDetection(num(node, "aiLikelihood"), node.path("reason").asText(""));
    }

    public ListeningSummary summarizeListening(int correct, int total) {
        // Deterministic; no LLM needed for objective MCQ scoring.
        return mock.summarizeListening(correct, total);
    }

    /**
     * Detailed, section-aware overall coaching. Uses OpenAI with a prompt that forces
     * every point to name the section it refers to; falls back to the (also section-aware)
     * mock evaluator on any error or when no key/quota is available.
     */
    public OverallFeedback buildOverall(Double listening, Double speaking, Double writing) {
        // Nothing attempted yet — there is nothing to coach on, so don't spend a call.
        // The mock's "how to get started" guidance is exactly right here and instant.
        if (listening == null && speaking == null && writing == null) {
            return mock.buildOverall(null, null, null);
        }
        String cacheKey = listening + "|" + speaking + "|" + writing;
        OverallFeedback cached = overallCache.get(cacheKey);
        if (cached != null) {
            return cached;
        }
        String status = "The employee's LATEST score per section (0-100, pass mark 75; "
                + "\"NOT ATTEMPTED\" means they have not taken it yet):\n"
                + "- Listening: " + fmtScore(listening) + "\n"
                + "- Speaking: " + fmtScore(speaking) + "\n"
                + "- Writing: " + fmtScore(writing);
        JsonNode node = openAi.completeJson(
                "You are a supportive but honest communication-skills coach for a CloudFuze employee. "
                        + "You are given the employee's latest score in three INDEPENDENT sections — "
                        + "Listening, Speaking and Writing (some may be NOT ATTEMPTED). Write DETAILED, "
                        + "SECTION-SPECIFIC feedback: every single point MUST start by naming the section it "
                        + "is about (e.g. \"Speaking (76/100): ...\"). Never give vague, generic praise. For a "
                        + "NOT ATTEMPTED section, do not invent a score — instead encourage the employee to take "
                        + "that test. Score bands: 90-100 excellent, 75-89 good (passes), 60-74 needs work, below "
                        + "60 weak. Return JSON with three arrays of clear full-sentence strings: \"strengths\" "
                        + "(what is going well and why, per section), \"weaknesses\" (what specifically needs "
                        + "improvement, per section, constructive), and \"suggestions\" (concrete, actionable next "
                        + "steps per section — what to practice, and to retake to track progress). Give 1-3 items "
                        + "per array and NEVER return an empty array — if there is nothing to praise or fix yet, "
                        + "guide the employee on how to get started.",
                status);
        if (node == null) {
            return mock.buildOverall(listening, speaking, writing);
        }
        List<String> strengths = strings(node, "strengths");
        List<String> weaknesses = strings(node, "weaknesses");
        List<String> suggestions = strings(node, "suggestions");
        // If the model returned nothing usable, fall back so the panel is never empty.
        if (strengths.isEmpty() && weaknesses.isEmpty() && suggestions.isEmpty()) {
            return mock.buildOverall(listening, speaking, writing);
        }
        OverallFeedback result = new OverallFeedback(strengths, weaknesses, suggestions);
        // Only REAL results are cached. Caching a mock fallback would pin placeholder text
        // to these scores permanently, so a transient outage or spent quota would keep
        // serving mock coaching long after OpenAI recovered.
        overallCache.put(cacheKey, result);
        return result;
    }

    private String fmtScore(Double s) {
        return s == null ? "NOT ATTEMPTED" : String.valueOf(Math.round(s)) + "/100";
    }

    // --- helpers ---

    /**
     * Drops "X should be X" style entries. Even when told not to, the model sometimes
     * "corrects" a figure that was already right — telling a candidate that 1,250,000
     * should be 1,250,000 destroys trust in the whole feedback panel, so the belt-and-
     * braces filter lives here rather than only in the prompt.
     */
    private List<String> dropNoOpCorrections(List<String> mistakes) {
        List<String> out = new ArrayList<>();
        for (String m : mistakes) {
            if (m == null || m.isBlank()) continue;
            java.util.regex.Matcher x = NO_OP_CORRECTION.matcher(m);
            if (x.find() && normalise(x.group(1)).equals(normalise(x.group(2)))) continue;
            out.add(m);
        }
        return out;
    }

    private static final java.util.regex.Pattern NO_OP_CORRECTION = java.util.regex.Pattern.compile(
            "(.+?)\\s+(?:should be|must be|->|→)\\s+(.+?)\\s*$", java.util.regex.Pattern.CASE_INSENSITIVE);

    /** Compares corrections ignoring quotes, spacing and trailing punctuation. */
    private String normalise(String s) {
        return s.replaceAll("[\"'`.,;:]", "").replaceAll("\\s+", " ").trim().toLowerCase(java.util.Locale.ROOT);
    }

    private double num(JsonNode node, String field) {
        return Math.max(0, Math.min(100, node.path(field).asDouble(0)));
    }

    private List<String> strings(JsonNode node, String field) {
        List<String> out = new ArrayList<>();
        JsonNode arr = node.path(field);
        if (arr.isArray()) arr.forEach(n -> out.add(n.asText()));
        return out;
    }

    /** Clamps to 0-100 and rounds to one decimal. Static so weightedOverall can share it. */
    private static double round(double v) {
        return Math.round(Math.max(0, Math.min(100, v)) * 10.0) / 10.0;
    }
}
