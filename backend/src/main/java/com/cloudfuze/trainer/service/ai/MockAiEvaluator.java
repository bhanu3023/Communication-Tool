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
            return new SpeakingEvaluation(0, 0, 0, 0, 0, 0, 0, List.of(),
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

        // Same weighting as the real evaluator, so a quota lapse cannot silently change how hard
        // the test is. See AiService.weightedOverall for why the English dimensions carry it.
        // Note this fallback derives every dimension from string overlap, so it cannot tell good
        // English from an exact echo -- it keeps a candidate scored during an outage, nothing more.
        double overall = AiService.weightedOverall(
                pronunciation, accuracy, fluency, grammar, vocabulary, confidence);

        List<String> suggestions = new ArrayList<>();
        if (accuracy < 50) suggestions.add("Your response did not match the sentence. Repeat it word for word.");
        else if (accuracy < 80) suggestions.add("Good attempt — a few words were missed or unclear.");
        if (lengthRatio < 0.6) suggestions.add("Say the complete sentence; part of it was missing.");
        if (suggestions.isEmpty()) suggestions.add("Excellent delivery — keep it up.");

        // No mistakes list from the fallback: it compares word overlap and cannot tell a wrong
        // preposition from a mis-transcription, and a made-up correction is worse than none.
        return new SpeakingEvaluation(round(pronunciation), round(accuracy), round(fluency),
                round(grammar), round(vocabulary), round(confidence), overall, List.of(), suggestions);
    }

    /**
     * Deterministic fallback for a spoken ANSWER, used when OpenAI is unavailable.
     *
     * <p>It cannot judge whether an answer is right, and it deliberately does not try. The
     * repetition fallback scores word overlap with the target, and doing that here would be
     * actively harmful: the "target" is the question, so a candidate who simply read the
     * question back would score highest. Length is the only honest signal available -- an
     * answer of a few words cannot have addressed two workstreams -- so it scores conservatively
     * and says plainly that the answer needs a human look.
     */
    public SpeakingEvaluation scoreSpokenAnswer(String question, String transcript) {
        String said = transcript == null ? "" : transcript.trim();
        if (said.isBlank()) {
            return new SpeakingEvaluation(0, 0, 0, 0, 0, 0, 0, List.of(),
                    List.of("No speech was detected. Press Record and answer the question aloud."));
        }
        int words = tokens(said).size();
        // A two-workstream answer runs well past 60 words; below that it cannot be complete.
        double coverage = words >= 120 ? 70 : words >= 60 ? 55 : words >= 25 ? 40 : 20;
        double overall = AiService.weightedOverall(70, coverage, 70, coverage, coverage, 70);
        List<String> tips = new ArrayList<>();
        tips.add("Automatic scoring was unavailable for this answer, so this score is provisional "
                + "and your answer has been kept for review.");
        if (words < 60) {
            tips.add("Your answer was short. These questions cover two migrations at once, so say "
                    + "something about each one and finish with what you would recommend.");
        }
        return new SpeakingEvaluation(70, round(coverage), 70, round(coverage), round(coverage), 70,
                overall, List.of(), tips);
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

        // Each house-style breach costs the two dimensions it actually damages, so the
        // score moves with the mistake rather than the feedback contradicting the number.
        int stylePenalty = Math.min(24, numberStyleIssues(text).size() * 8);
        professionalism = clamp(professionalism - stylePenalty);
        clarity = clamp(clarity - stylePenalty);
        readability = clamp((clarity + conciseness) / 2);

        double overall = round((grammar + clarity + vocabulary + tone + professionalism
                + structure + readability + completeness + spelling + conciseness) / 10.0);

        List<String> mistakes = new ArrayList<>();
        // House style is graded, not just advertised: US digit grouping and dollars.
        List<String> styleIssues = numberStyleIssues(text);
        mistakes.addAll(styleIssues);
        if (words < 60) mistakes.add("Response is too short to fully address the task.");
        if (avgSentenceLen > 24) mistakes.add("Some sentences are long; break them up for clarity.");
        if (punctuationIssues(text) > 0) mistakes.add("Check punctuation and capitalization.");

        List<String> suggestions = new ArrayList<>();
        if (!styleIssues.isEmpty()) {
            suggestions.add("Write figures for a US reader: group digits in threes ($1,250,000) and "
                    + "quote money in dollars — no lakh, crore or rupee amounts.");
        }
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
        record Sec(String name, Double score) {}
        List<Sec> secs = Arrays.asList(
                new Sec("Listening", listening),
                new Sec("Speaking", speaking),
                new Sec("Writing", writing));

        List<String> strengths = new ArrayList<>();
        List<String> weaknesses = new ArrayList<>();
        List<String> suggestions = new ArrayList<>();

        // Detailed, section-by-section read on the latest scores (pass mark 75).
        for (Sec s : secs) {
            if (s.score() == null) {
                weaknesses.add(s.name() + ": not attempted yet — take this test to get a score and detailed feedback.");
                suggestions.add("Start the " + s.name() + " test to complete your communication profile.");
                continue;
            }
            double v = round(s.score());
            if (v >= 85) {
                strengths.add(s.name() + " is excellent (" + v + "/100) — clear, confident and effective.");
            } else if (v >= 75) {
                strengths.add(s.name() + " passes the bar (" + v + "/100, pass mark 75) — solid, with a little room to sharpen.");
            } else if (v >= 60) {
                weaknesses.add(s.name() + " is just below the pass mark (" + v + "/100, need 75) — focused practice should close the gap.");
            } else {
                weaknesses.add(s.name() + " needs the most work (" + v + "/100) — make this your top priority.");
            }
        }

        // Prioritise the lowest ATTEMPTED section, then a general nudge.
        secs.stream()
                .filter(s -> s.score() != null)
                .min((a, b) -> Double.compare(a.score(), b.score()))
                .ifPresent(s -> suggestions.add("Prioritise " + s.name() + " practice over the next two weeks."));
        suggestions.add("Retake a section to track your improvement over time.");

        // Never leave a column empty (avoids a bare "No data yet.").
        if (strengths.isEmpty()) {
            boolean anyAttempted = secs.stream().anyMatch(s -> s.score() != null);
            strengths.add(anyAttempted
                    ? "Consistent effort so far — keep practising to turn these into clear strengths."
                    : "Ready to begin — complete a section to start building your strengths.");
        }
        if (weaknesses.isEmpty()) {
            weaknesses.add("No major weaknesses — keep pushing your scores even higher.");
        }
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

    /**
     * House-style breaches in how numbers and money are written. The company writes for a
     * US audience, so digits group in threes ($1,250,000); Indian grouping (12,50,000),
     * lakh/crore, and rupee amounts are errors the Writing section deliberately trains out.
     *
     * Deterministic on purpose — this must hold even when OpenAI is unavailable and the
     * mock evaluator is doing the marking.
     */
    List<String> numberStyleIssues(String content) {
        List<String> issues = new ArrayList<>();
        if (content == null || content.isBlank()) return issues;
        String text = content;
        String lower = text.toLowerCase(Locale.ROOT);

        // Indian grouping: a 1-2 digit lead, then one or more 2-digit groups, then a final
        // 3-digit group — 12,34,567 / 1,23,456. US grouping never has a 2-digit group.
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("\\b\\d{1,2}(?:,\\d{2})+,\\d{3}\\b").matcher(text);
        java.util.Set<String> found = new java.util.LinkedHashSet<>();
        while (m.find()) found.add(m.group());
        for (String bad : found) {
            issues.add("\"" + bad + "\" uses Indian digit grouping — write it US-style as \""
                    + regroupInThrees(bad) + "\".");
        }

        if (lower.matches("(?s).*\\b(lakh|lakhs|lac|lacs|crore|crores)\\b.*")) {
            issues.add("Avoid lakh/crore — state the figure in full with digits grouped in threes "
                    + "(e.g. 1,500,000).");
        }
        if (text.contains("₹") || lower.matches("(?s).*(\\brs\\.?\\s*\\d|\\binr\\b|\\brupees?\\b).*")) {
            issues.add("Money must be quoted in US dollars ($), not rupees.");
        }
        return issues;
    }

    /** Re-groups the digits of a number into threes, preserving nothing but the digits. */
    private String regroupInThrees(String grouped) {
        String digits = grouped.replace(",", "");
        StringBuilder out = new StringBuilder();
        int count = 0;
        for (int i = digits.length() - 1; i >= 0; i--) {
            out.append(digits.charAt(i));
            if (++count % 3 == 0 && i > 0) out.append(',');
        }
        return out.reverse().toString();
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
