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

    /**
     * Scores one spoken sentence as a test of ENGLISH, from what the transcriber heard.
     *
     * <p>This used to be a repetition matcher wearing an examiner's clothes: accuracy — how
     * exactly the target's words came back — carried 60% of the grade, so the section largely
     * measured short-term recall. On the Level 2 set that now runs to 57 words, recall is the
     * wrong thing to measure: a candidate who reproduces the meaning in fluent, correct English
     * and drops three words has spoken BETTER than one who echoes every word in a broken string.
     * Grammar, vocabulary and intelligibility now carry 60% between them and accuracy 30%, so the
     * mark follows the English rather than the echo. See {@link #weightedOverall}.
     *
     * <p>The examiner is told what it is actually reading. It never hears the voice: the recording
     * goes to gpt-4o-transcribe and only that text arrives here, at a measured ~13% word error
     * rate on real candidate recordings (see .claude/memory/decisions.md). Roughly one word in
     * eight can therefore be the transcriber's mistake rather than the candidate's, which is why
     * the prompt asks it to weigh whether a difference is a plausible mishearing before marking
     * it, and forbids it from asserting anything about pace, hesitation or tone that only the
     * audio could show. An examiner that does not know its evidence is thin will overstate it.
     *
     * <p>The rubric stays accent-fair. These candidates are freshers speaking Indian English,
     * which is a standard variety of the language and not a defect, so the examiner judges whether
     * they would be UNDERSTOOD — never how close they sound to an American or British speaker.
     * Accent-fair is NOT lenient, and the prompt says so: an accent it must ignore, a wrong word
     * it must mark and name.
     *
     * <p>Tips have to teach. A tip that says "you made a grammar mistake" tells a fresher nothing
     * they can act on, so the examiner must quote what was said, give the corrected form, and hand
     * back one line to practise aloud. This is the only English coaching most of them get.
     */
    public SpeakingEvaluation scoreSpeaking(String expected, String transcript) {
        // No speech -> deterministic zero, regardless of provider (don't ask the LLM to score nothing).
        if (transcript == null || transcript.isBlank()) {
            return mock.scoreSpeaking(expected, transcript);
        }
        JsonNode node = openAi.completeJson(
                "You are a STRICT senior English examiner assessing how well a candidate SPEAKS "
                        + "ENGLISH. They were shown a workplace sentence about a data migration and asked to say "
                        + "it aloud. You are grading their ENGLISH — grammar, vocabulary, sentence control and "
                        + "clarity — NOT their memory. Both texts below have been lowercased with punctuation "
                        + "stripped, so there is nothing to judge there.\n"

                        + "WHAT YOUR EVIDENCE ACTUALLY IS. You have NOT heard the recording. You are reading an "
                        + "automatic transcript produced by a speech-to-text model measured at about a 13% word "
                        + "error rate on recordings from these very candidates. That means ROUGHLY ONE WORD IN "
                        + "EIGHT of the heard line may be the machine's mistake and not the speaker's. Before you "
                        + "mark any single-word difference, ask whether a transcriber would plausibly produce it "
                        + "from correct speech. If the heard word is a near-homophone or an acoustic neighbour of "
                        + "the target, treat it as a transcription artefact and do NOT mark it. Mark a difference "
                        + "only when it is too large to be a mishearing: a content word plainly absent, a whole "
                        + "clause missing, or a word that means something else entirely. When you genuinely "
                        + "cannot tell, favour the candidate and say nothing about it. Breakdown running across "
                        + "the whole line is real and must be marked; a scattered word here and there is the "
                        + "machine.\n"

                        + "THESE ARE NEVER MISTAKES and must not cost a mark or earn a tip, because they are the "
                        + "transcriber's habits rather than the candidate's speech: normalising numbers "
                        + "(\"twenty percent\" -> \"20%\"); its own sentence breaks and capitalisation; and how it "
                        + "splits or joins a compound word. \"sub folders\" and \"subfolders\", \"on boarding\" "
                        + "and \"onboarding\", \"any one\" and \"anyone\" are the same word spoken aloud: nobody "
                        + "pronounces a hyphen or a space, so treat them as an exact match and say nothing. A "
                        + "homophone is forgiven ONLY when the meaning is identical; if the substituted word "
                        + "means something else, it is a mistake and must be marked.\n"

                        + "GRAMMAR AND VOCABULARY ARE THE HEART OF THIS MARK and are scored ON THE SENTENCE AS "
                        + "HEARD, NOT on the target. Read the heard line completely on its own, as though you had "
                        + "never seen the target, and ask: is this grammatical, natural, sensible English that a "
                        + "colleague could act on? Judge tense agreement, articles, plurals, prepositions, word "
                        + "order and connectives. If it is not clean English, grammar CANNOT be 100 — lower it in "
                        + "proportion to how broken it is; the same for vocabulary when words are used wrongly, "
                        + "imprecisely or nonsensically. The target being well written earns the candidate "
                        + "NOTHING here. Do NOT reason that a fault 'is a repetition error, not a grammar error' "
                        + "and hand back full marks: a listener hears only what was said.\n"

                        + "ACCURACY is the SMALLER part of this mark and means: did the MEANING of the target "
                        + "survive? Judge the message, not the wording. A candidate who kept every fact and every "
                        + "instruction in their own correct words scores HIGH here even when the phrasing differs "
                        + "— do not punish a synonym or a reordered clause. Deduct when facts, names, numbers, "
                        + "dates or whole instructions are lost. SCORE PROPORTIONALLY: reserve 0 for a response "
                        + "with nothing recognisable from the target, and place a partial answer in between in "
                        + "proportion to how much meaning survived. The later sentences in this set run past "
                        + "fifty words; on those, dropping a minor detail is normal and is not a collapse.\n"

                        + "PRONUNCIATION here means INTELLIGIBILITY, the one thing about the voice this "
                        + "transcript can honestly evidence: the transcriber is accent-robust, so a target word "
                        + "it recovered was clear enough to be understood. Award 90-95 when essentially every "
                        + "target word came back; deduct for each target word that returned as a different, "
                        + "similar-sounding word AND name it. Never exceed 95 — finer detail cannot be heard from "
                        + "text.\n"

                        + "FLUENCY and CONFIDENCE cannot be observed in a transcript at all. Give a moderate "
                        + "neutral estimate (about 65-75) for both and NEVER award 90+ on transcript alone. Do "
                        + "NOT write a tip claiming they paused, rushed, hesitated, mumbled, sounded nervous or "
                        + "spoke too quietly — you have not heard the recording, and inventing that is a claim "
                        + "the candidate cannot check.\n"

                        + "THE SPEAKER IS AN INDIAN ENGLISH SPEAKER, EARLY IN THEIR CAREER. Indian English is a "
                        + "standard variety of English, not an error. Judge whether a colleague would UNDERSTAND "
                        + "them, never how close they sound to an American or British speaker. You must NOT "
                        + "deduct for, or comment on: the accent, mother-tongue influence, syllable-timed rhythm "
                        + "or intonation, v/w, th/d/t, p/f or retroflex consonants, or Indian English wording "
                        + "that is normal in Indian business usage. Never tell them to sound native, neutral, "
                        + "American or British, and never use the words 'accent' or 'mother tongue'. Being fair "
                        + "about the accent is not being lenient about the English.\n"

                        + "USE THE FULL 0-100 RANGE AND DO NOT INFLATE. Bands for grammar and vocabulary: 90-100 "
                        + "clean, natural professional English; 75-89 correct with a slip or two; 60-74 "
                        + "understandable but with clear errors; 40-59 effortful, several errors; below 40 "
                        + "broken. A genuinely strong answer must be able to reach the 90s — do not shave marks "
                        + "off a good one just to look strict.\n"

                        + "NOW COACH THEM. Return a 'suggestions' array of 2 to 4 tips. This feedback is the only "
                        + "English teaching most of these candidates receive, so every tip must be something they "
                        + "can DO. Rules for tips:\n"
                        + "1. Open with ONE tip naming a real strength in THIS answer, quoting the part they "
                        + "handled well. Never vague praise like 'good job' — say what was good and why it "
                        + "worked.\n"
                        + "2. For each fault, QUOTE what they said, give the CORRECTED form in quotes, and add a "
                        + "short reason a colleague would understand — you said X, say Y instead, because Z.\n"
                        + "3. Finish with ONE line they can practise ALOUD: eight to fifteen words using the word "
                        + "or structure they got wrong, in the same migration context, so they leave with "
                        + "something to rehearse.\n"
                        + "4. If the answer really was faultless, say so plainly in the first tip, name the "
                        + "hardest part they got right, and still leave them one harder line to practise.\n"
                        + "5. Speak TO the candidate as 'you'. Be warm, specific and direct. No jargon, no "
                        + "examiner-speak, and never restate the score.\n"
                        + "NEVER write a tip about spelling, hyphens, spacing, capitalisation or how a word was "
                        + "written down. The candidate is SPEAKING, not typing: they cannot pronounce a hyphen "
                        + "and they did not choose how the transcriber spelled anything.\n"
                        + "Return JSON numeric fields (0-100): pronunciation, accuracy, fluency, grammar, "
                        + "vocabulary, confidence, plus the 'suggestions' array.",
                "Target sentence: \"" + forComparison(expected) + "\"\n"
                        + "Heard in the recording: \"" + forComparison(transcript) + "\"");
        if (node == null) {
            return mock.scoreSpeaking(expected, transcript);
        }
        double pronunciation = num(node, "pronunciation");
        double accuracy = num(node, "accuracy");
        double fluency = num(node, "fluency");
        double confidence = num(node, "confidence");
        // Grammar and vocabulary are capped relative to accuracy. Between them they now carry 40%
        // of the grade -- more than before -- and the examiner kept awarding 100 for both on
        // utterances that were plainly broken -- "has the migration from slack to and also
        // something else" scored 100/100 -- reasoning that a repetition slip is not a grammar
        // fault. That quietly rescued answers that should have failed. Saying so in the prompt
        // worked on some sentences and not others, so the ceiling is enforced here rather than
        // left to the model's mood, and it matters more now that these two lead the mark.
        //
        // The slack is deliberate, and the wider accuracy definition makes it more generous than it
        // looks: accuracy now scores whether the MEANING survived, so a candidate who conveys the
        // whole message in their own words scores high on it and the cap never engages. It bites
        // only when meaning was genuinely lost -- someone who says less than the target can still
        // say it grammatically, so these may sit above accuracy, just not at full marks while the
        // answer itself was hollow. On a full read the cap is off the top of the scale.
        double ceiling = accuracy + 25;
        double grammar = Math.min(num(node, "grammar"), ceiling);
        double vocabulary = Math.min(num(node, "vocabulary"), ceiling);
        double overall = weightedOverall(pronunciation, accuracy, fluency, grammar, vocabulary, confidence);
        return new SpeakingEvaluation(round(pronunciation), round(accuracy), round(fluency),
                round(grammar), round(vocabulary), round(confidence), overall, strings(node, "suggestions"));
    }

    /**
     * Combines the six sub-scores into the section score.
     *
     * <p>Two constraints shape this. First, only some dimensions can be evidenced: pronunciation,
     * fluency and confidence are judged from a transcript, not the voice, so the prompt holds
     * fluency and confidence at a neutral ~70 and caps pronunciation at 95. A dimension pinned to
     * a constant cannot carry much weight without deciding the outcome by itself — when those
     * three carried 55%, that constant capped a FLAWLESS answer at about 83.5 against a Level 2
     * pass mark of 80, so the bar was not strict, it was barely reachable.
     *
     * <p>Second, this is a test of ENGLISH. Weight sat on accuracy at 60%, which made the section
     * a repetition matcher: it mostly measured whether the candidate could echo the target's exact
     * words, and someone who conveyed the whole message in their own correct English scored below
     * someone who parroted the words in a broken string. That is backwards for a section whose
     * purpose is to find out how well they speak. On the Level 2 set, which now runs to 57 words,
     * exact recall is not even a reasonable thing to ask.
     *
     * <p>So the English carries the mark: grammar (22) and vocabulary (18) judged on the sentence
     * as actually spoken, plus intelligibility (20), is 60% between them. Accuracy keeps 30% —
     * meaning preserved, not wording matched — and fluency and confidence keep a token 10% so they
     * still appear in feedback without deciding anything. A flawless answer scores about 96, so 75
     * and 80 stay clearable; a fluent-but-lossy answer can now pass, and a word-perfect but broken
     * one cannot.
     *
     * <p>If real pronunciation scoring is ever restored (it needs a service that hears the voice,
     * which {@link #scoreSpeakingFromAudio} is not), pronunciation should take more of the weight
     * back from accuracy.
     */
    static double weightedOverall(double pronunciation, double accuracy, double fluency,
                                  double grammar, double vocabulary, double confidence) {
        return round(accuracy * 0.30
                + grammar * 0.22
                + vocabulary * 0.18
                + pronunciation * 0.20
                + fluency * 0.05
                + confidence * 0.05);
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
        return openAi.transcribe(wav, null);
    }

    /**
     * Transcribes a recording in the container the browser produced.
     *
     * @param audio    raw recorded bytes, exactly as the browser wrote them
     * @param mimeType the browser's container type, e.g. {@code audio/webm;codecs=opus}
     */
    public Transcription transcribe(byte[] audio, String mimeType) {
        return openAi.transcribe(audio, mimeType);
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

    /**
     * Scores one written response at the level of a first-year employee who is still learning.
     *
     * <p>The examiner used to be a "STRICT senior business-writing examiner" who was told to
     * HEAVILY penalise. Marked to that standard, a piece of writing a manager would happily send
     * after two small edits came back in the fifties, and the candidate learned only that they
     * had failed. These are freshers; the section exists to teach them, so the bar is now a
     * competent first-year employee rather than a consultant, and the tone is developmental.
     *
     * <p>Easier is not the same as vague. The single biggest source of harsh marks was not the
     * bands but the arithmetic: the section score is a flat average of TEN fields, so one
     * clumsy sentence marked down under grammar AND clarity AND tone AND professionalism AND
     * readability moved the average four times for one fault. The prompt now says explicitly
     * that each fault belongs to the field it actually concerns.
     *
     * <p><strong>Indian English is handled differently here than in speaking, deliberately.</strong>
     * {@link #scoreSpeaking} forbids the examiner from deducting for an accent, because an
     * accent is how a person sounds and is not an error. Writing has no accent. What it has is
     * usage — "do the needful", "revert back", "kindly", "prepone", "the same" — which is
     * perfectly correct Indian business English but reads as odd or unclear to the American
     * customers this company writes to. That is a learnable, teachable difference, so these are
     * named and corrected, with a small mark impact and never a lecture. Same principle in both
     * places: never mark WHO someone is, do teach what the reader needs.
     */
    public WritingEvaluation scoreWriting(String category, String prompt, String content) {
        // No response -> deterministic zero, regardless of provider.
        if (content == null || content.isBlank()) {
            return mock.scoreWriting(category, prompt, content);
        }
        JsonNode node = openAi.completeJson(
                "You are an experienced business-writing COACH at a software company, marking "
                        + "FIRST-YEAR employees who are still learning to write at work. They were given a "
                        + "workplace SITUATION and a task — usually a customer email or an internal update — and "
                        + "wrote a response. Your job is to give them an honest mark AND teach them how to do it "
                        + "better next time.\n"

                        + "PITCH THE BAR AT A COMPETENT FIRST-YEAR EMPLOYEE, NOT A SENIOR CONSULTANT. The "
                        + "question is: would a colleague or a customer understand this, be able to act on it, and "
                        + "find it professional? It does NOT have to be elegant, perfectly balanced, or the way you "
                        + "would have written it. If a manager could send it after one or two small edits, that is "
                        + "a good answer and must score in the 80s.\n"

                        + "BANDS. 90-100 ready to send as it stands. 80-89 clear and professional, one or two "
                        + "small fixes. 70-79 does the job and covers the task, several fixable issues. 55-69 "
                        + "understandable but would need rewriting before anyone sent it. 35-54 confusing, or "
                        + "missing something the situation required. Below 35 off-topic, one line, or unusable. "
                        + "Use the whole range honestly — do not inflate a weak answer, and do not shave marks off "
                        + "a decent one to look rigorous.\n"

                        + "SCORE EACH FAULT ONCE, IN THE FIELD IT BELONGS TO. This is the most important "
                        + "instruction here. The ten fields are averaged, so marking one clumsy sentence down "
                        + "under grammar AND clarity AND tone AND professionalism AND readability punishes a "
                        + "single fault five times and drags an average answer into the forties. A spelling "
                        + "mistake is a spelling mistake: it is not also a professionalism failure. A missing "
                        + "deadline is completeness, not tone. Only lower a field when THAT field is genuinely "
                        + "weak on its own terms.\n"

                        + "Score each field 0-100: grammar, spelling, clarity, vocabulary, tone (right for the "
                        + "reader — warm and reassuring to a customer, brief and direct to a manager), "
                        + "professionalism, structure (greeting, body, a clear ask, a closing, where those "
                        + "apply), readability, conciseness, and completeness — did it cover what the situation "
                        + "asked for, such as the cause, a specific date or time, what happens next, an apology "
                        + "where one is warranted, and the exact request.\n"

                        + "COMPLETENESS IS PROPORTIONAL. Deduct for each thing the task asked for and did not "
                        + "get, in proportion to how much is missing — three of four points covered is a good "
                        + "answer with a gap, not a failure. Reserve the bottom of the range for a response that "
                        + "ignored the situation, or is so short it could not have covered it.\n"

                        + "INDIAN ENGLISH USAGE. These candidates write Indian business English, which is correct "
                        + "English — but this company writes to AMERICAN customers, and some usages read as odd, "
                        + "old-fashioned or unclear to that reader. Treat them as things to LEARN, not as bad "
                        + "writing: name each one in 'mistakes' with the natural US equivalent, and let it weigh "
                        + "only lightly on vocabulary or tone. Common ones: \"do the needful\" (say what you "
                        + "actually want done), \"revert back\" (\"reply\" or \"get back to you\"), \"kindly\" "
                        + "(\"please\"), \"prepone\" (\"move up\" / \"bring forward\"), \"please intimate\" "
                        + "(\"please let me know\"), \"the same\" used as a pronoun (\"it\" / \"them\"), \"updation\" "
                        + "(\"update\"), \"discuss about\" (\"discuss\"), \"return back\" (\"return\"), \"out of "
                        + "station\" (\"out of town\"), \"myself <name>\" (\"my name is\" / \"I am\"), and "
                        + "\"good name\" (\"your name\"). Never call this wrong English, never mention accent, "
                        + "and never tell them to sound American — explain only what the customer will find "
                        + "clearer.\n"

                        + "HOUSE STYLE, and this one IS marked as a concrete error: this is a US-facing company, "
                        + "so figures group digits in THREES with commas (e.g. $1,250,000). Indian grouping "
                        + "(12,50,000 / 1,23,456), the words lakh/lakhs/crore/crores, and any rupee amount (Rs., "
                        + "INR, the rupee sign) must each be listed in 'mistakes' with the correct US form, and "
                        + "lower professionalism and clarity. CRITICAL: only list a figure if it ACTUALLY breaks "
                        + "the rule — never emit a correction identical to the original (never write \"1,250,000 "
                        + "should be 1,250,000\"). A figure already grouped in threes and already in dollars is "
                        + "CORRECT: say nothing about it.\n"

                        + "NOW TEACH. 'mistakes' lists concrete errors, each quoting what they wrote and giving "
                        + "the correction. 'suggestions' gives 2-4 specific improvements they can act on — start "
                        + "with ONE thing this answer genuinely did well, quoting it, then the rest as "
                        + "you-wrote-X, write-Y-instead, because-Z. Speak to them as 'you', warmly and plainly, "
                        + "and never restate the score. 'improvedVersion' is a polished, ready-to-send model "
                        + "answer for THIS exact situation, close enough to what they wrote that they can see how "
                        + "their own attempt becomes it.\n"

                        + "Return JSON with the ten numeric fields plus 'mistakes', 'suggestions' and "
                        + "'improvedVersion'.",
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
