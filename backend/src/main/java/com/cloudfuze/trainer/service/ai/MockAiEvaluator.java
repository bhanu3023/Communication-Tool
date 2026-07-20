package com.cloudfuze.trainer.service.ai;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Deterministic heuristic evaluator used when no OpenAI key is configured (dev)
 * or as a fallback if the OpenAI call fails. Scores are derived from measurable
 * text properties so the whole app functions offline.
 */
@Component
public class MockAiEvaluator {

    public SpeakingEvaluation scoreSpeaking(String expected, String transcript) {
        String said = transcript == null ? "" : transcript.trim();

        // No speech captured -> zero across the board. Skipping must never score.
        if (said.isBlank()) {
            return new SpeakingEvaluation(0, 0, 0, 0, 0, 0, 0,
                    List.of("No speech was detected. Press Record and repeat the sentence aloud."));
        }

        // Every metric is earned from what was actually said (word overlap with the target).
        double coverage = similarity(expected, said);   // 0..1
        double accuracy = coverage * 100.0;
        int expectedWords = tokens(expected).size();
        int saidWords = tokens(said).size();
        double lengthRatio = expectedWords == 0 ? 1.0 : Math.min(1.0, (double) saidWords / expectedWords);

        double pronunciation = accuracy * 0.95;
        double vocabulary = accuracy;                    // words correctly reproduced (not the target's words)
        double grammar = accuracy;                       // correct repetition implies grammatical output
        double fluency = accuracy * (0.6 + 0.4 * lengthRatio);
        double confidence = accuracy * (0.7 + 0.3 * lengthRatio);

        double overall = round(
                pronunciation * 0.30 + accuracy * 0.25 + fluency * 0.20
                        + grammar * 0.10 + vocabulary * 0.10 + confidence * 0.05);

        List<String> suggestions = new ArrayList<>();
        if (accuracy < 50) suggestions.add("Your response did not match the sentence. Repeat it word for word.");
        else if (accuracy < 80) suggestions.add("Good attempt — a few words were missed or unclear.");
        if (lengthRatio < 0.6) suggestions.add("Say the complete sentence; part of it was missing.");
        if (suggestions.isEmpty()) suggestions.add("Excellent delivery — keep it up.");

        return new SpeakingEvaluation(round(pronunciation), round(accuracy), round(fluency),
                round(grammar), round(vocabulary), round(confidence), overall, suggestions);
    }

    public WritingEvaluation scoreWriting(String category, String prompt, String content) {
        String text = content == null ? "" : content.trim();
        int words = text.isBlank() ? 0 : text.split("\\s+").length;

        // No response -> zero across the board. Skipping must never score.
        if (words == 0) {
            return new WritingEvaluation(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                    List.of("No response was written."),
                    List.of("Address the prompt with a clear, well-structured response."),
                    "");
        }

        int sentences = Math.max(1, text.split("[.!?]+").length);
        double avgSentenceLen = (double) words / sentences;
        // Quality marks are only fully earned once the answer is developed (~40+ words),
        // so a one-word or throwaway answer cannot score high.
        double dev = Math.min(1.0, words / 40.0);

        double completeness = clamp(Math.min(100, words * 100.0 / 120.0)); // ~120 words = complete
        double structure = clamp((sentences >= 3 ? 85 : 60) * dev);
        double clarity = clamp((avgSentenceLen > 8 && avgSentenceLen < 24 ? 88 : 70) * dev);
        double conciseness = clamp((avgSentenceLen <= 22 ? 85 : 65) * dev);
        double grammar = clamp((85 - punctuationIssues(text) * 4) * dev);
        double spelling = clamp((90 - repeatedCharWords(text) * 5) * dev);
        double vocabulary = clamp((60 + uniqueRatio(text) * 40) * dev);
        double professionalism = clamp((hasGreetingOrSignoff(text, category) ? 88 : 72) * dev);
        double tone = clamp(professionalism - 4);
        double readability = clamp((clarity + conciseness) / 2);

        double overall = round((grammar + clarity + vocabulary + tone + professionalism
                + structure + readability + completeness + spelling + conciseness) / 10.0);

        List<String> mistakes = new ArrayList<>();
        if (words < 60) mistakes.add("Response is too short to fully address the task.");
        if (avgSentenceLen > 24) mistakes.add("Some sentences are long; break them up for clarity.");
        if (punctuationIssues(text) > 0) mistakes.add("Check punctuation and capitalization.");

        List<String> suggestions = new ArrayList<>();
        suggestions.add("Open with a clear purpose statement.");
        if (!hasGreetingOrSignoff(text, category))
            suggestions.add("Add an appropriate greeting and sign-off for a " + category.toLowerCase(Locale.ROOT) + ".");
        suggestions.add("Use concrete details (dates, owners, next steps).");

        String improved = "Subject: " + category + "\n\n" + (text.isBlank()
                ? "Hi team,\n\nHere is a concise, structured version addressing the task with a clear purpose, key details, and next steps.\n\nBest regards"
                : text + "\n\n(Tip: tighten wording and ensure a clear next step.)");

        return new WritingEvaluation(round(grammar), round(clarity), round(vocabulary), round(tone),
                round(professionalism), round(structure), round(readability), round(completeness),
                round(spelling), round(conciseness), overall, mistakes, suggestions, improved);
    }

    public ListeningSummary summarizeListening(int correct, int total) {
        double accuracy = total == 0 ? 0 : (correct * 100.0 / total);
        double attention = clamp(accuracy + 3);
        double consistency = clamp(accuracy - 2);
        List<String> strengths = new ArrayList<>();
        List<String> weaknesses = new ArrayList<>();
        List<String> suggestions = new ArrayList<>();
        if (accuracy >= 80) strengths.add("Strong retention of key details from the audio.");
        else weaknesses.add("Missed several factual details in the passages.");
        if (accuracy >= 90) strengths.add("Consistent attention across all questions.");
        else suggestions.add("Take brief mental notes of names, numbers, and decisions while listening.");
        if (suggestions.isEmpty()) suggestions.add("Maintain focus during longer passages.");
        return new ListeningSummary(round(attention), round(accuracy), round(consistency),
                strengths, weaknesses, suggestions);
    }

    public OverallFeedback buildOverall(Double listening, Double speaking, Double writing) {
        List<String> strengths = new ArrayList<>();
        List<String> weaknesses = new ArrayList<>();
        List<String> suggestions = new ArrayList<>();
        record Pair(String name, Double score) {}
        List<Pair> scores = Arrays.asList(
                new Pair("Listening", listening),
                new Pair("Speaking", speaking),
                new Pair("Writing", writing));
        for (Pair p : scores) {
            if (p.score() == null) continue;
            if (p.score() >= 80) strengths.add(p.name() + " is a clear strength (" + round(p.score()) + ").");
            else if (p.score() < 65) weaknesses.add(p.name() + " needs focused improvement (" + round(p.score()) + ").");
        }
        scores.stream()
                .filter(p -> p.score() != null)
                .min((a, b) -> Double.compare(a.score(), b.score()))
                .ifPresent(p -> suggestions.add("Prioritize practice in " + p.name() + " over the next two weeks."));
        suggestions.add("Retake the assessment to track improvement over time.");
        if (strengths.isEmpty()) strengths.add("Consistent effort across all three sections.");
        return new OverallFeedback(strengths, weaknesses, suggestions);
    }

    /**
     * Heuristic AI-likelihood estimate from measurable style properties: AI text
     * tends to be long, polished (few errors), and uniform in sentence length.
     * This is a weak indicator, not a definitive detector.
     */
    public AiDetection detectAi(String content) {
        String text = content == null ? "" : content.trim();
        if (text.isBlank()) {
            return new AiDetection(0, "No content to analyse.");
        }
        String[] sentences = text.split("[.!?]+");
        int words = text.split("\\s+").length;

        // Too short to judge — don't flag brief, legitimately-typed answers as AI.
        if (words < 40) {
            return new AiDetection(round(Math.min(30, words * 0.6)), "Too short to assess reliably.");
        }

        // Sentence-length uniformity: low variance in words-per-sentence looks AI-like.
        double mean = 0;
        int counted = 0;
        for (String s : sentences) {
            if (s.isBlank()) continue;
            mean += s.trim().split("\\s+").length;
            counted++;
        }
        mean = counted == 0 ? 0 : mean / counted;
        double variance = 0;
        for (String s : sentences) {
            if (s.isBlank()) continue;
            double len = s.trim().split("\\s+").length;
            variance += Math.pow(len - mean, 2);
        }
        variance = counted == 0 ? 0 : variance / counted;
        double stddev = Math.sqrt(variance);
        // Uniformity is only meaningful with several sentences; otherwise stay neutral.
        double uniformity = counted >= 3 ? clamp(100 - stddev * 12) : 50;

        double polish = clamp(100 - (punctuationIssues(text) * 15) - (repeatedCharWords(text) * 15));
        double lengthFactor = clamp(Math.min(100, words * 100.0 / 150.0));

        double score = round(uniformity * 0.4 + polish * 0.35 + lengthFactor * 0.25);
        String note = score >= 65
                ? "Uniform, polished, generic style — common in AI-generated text."
                : "Varied phrasing and imperfections consistent with human writing.";
        return new AiDetection(score, note);
    }

    // --- heuristics ---

    private double similarity(String a, String b) {
        Set<String> sa = tokens(a);
        Set<String> sb = tokens(b);
        if (sa.isEmpty()) return b == null || b.isBlank() ? 1.0 : 0.0;
        Set<String> inter = new HashSet<>(sa);
        inter.retainAll(sb);
        Set<String> union = new HashSet<>(sa);
        union.addAll(sb);
        return union.isEmpty() ? 0.0 : (double) inter.size() / union.size();
    }

    private Set<String> tokens(String s) {
        Set<String> out = new HashSet<>();
        if (s == null) return out;
        for (String t : s.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9 ]", "").split("\\s+")) {
            if (!t.isBlank()) out.add(t);
        }
        return out;
    }

    private double uniqueRatio(String s) {
        Set<String> t = tokens(s);
        String[] all = s == null ? new String[0] : s.toLowerCase(Locale.ROOT).split("\\s+");
        return all.length == 0 ? 0 : (double) t.size() / all.length;
    }

    private int punctuationIssues(String s) {
        if (s == null || s.isBlank()) return 1;
        int issues = 0;
        if (!s.matches(".*[.!?]\\s*$")) issues++;
        if (!Character.isUpperCase(s.trim().charAt(0))) issues++;
        return issues;
    }

    private int repeatedCharWords(String s) {
        int count = 0;
        for (String w : tokens(s)) if (w.matches(".*(.)\\1\\1.*")) count++;
        return count;
    }

    private boolean hasGreetingOrSignoff(String s, String category) {
        String l = s.toLowerCase(Locale.ROOT);
        return l.contains("hi ") || l.contains("hello") || l.contains("dear")
                || l.contains("regards") || l.contains("thanks") || l.contains("thank you");
    }

    private double clamp(double v) {
        return Math.max(0, Math.min(100, v));
    }

    private double round(double v) {
        return Math.round(clamp(v) * 10.0) / 10.0;
    }
}
