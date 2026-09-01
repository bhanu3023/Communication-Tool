# Domain Knowledge

The business/domain concepts behind the AI Comm Trainer. Read this before touching scoring, sessions,
or assessment logic.

## Actors
- **User** with a `Role` (`EMPLOYEE` / `MANAGER`), belonging to a `Department` and `Team`, and (for
  employees) reporting to a manager. Provisioned from the Microsoft ID token on first login.

## Assessment structure
- Three **sections** (`Section` enum): **LISTENING**, **SPEAKING**, **WRITING**.
- A user takes a section as an **`AssessmentSession`** (`SessionStatus`); each produces a
  **`SectionResult`** (scores + a JSON `details` payload with per-item breakdown).
- Content is drawn from banks: `ListeningQuestion` (+ `ListeningStory`), `SpeakingSentence`,
  `WritingPrompt`. `Difficulty` enum tags items.

## Scoring rules (authoritative — keep tests in sync)
- **Listening** — objective MCQ: **10 marks per correct answer, max 100**. AI "summary"
  (attention / accuracy / consistency) is deterministic.
- **Speaking** — per sentence, weighted rubric:
  **accuracy 60% · grammar 15% · vocabulary 15% · pronunciation 5% · fluency 3% · confidence 2%**
  (`AiService.weightedOverall`). Weight sits on what the recording can actually evidence; the older
  pronunciation-30% split predates that and is no longer the code. Section score = average across
  the sentences.
  - **Transcriber is `gpt-4o-transcribe` WITH the accent prompt** (13.0% WER on real candidate
    audio vs whisper-1's 15.8%). Without the prompt that model is the worst option (20.6%) --
    the two must move together. See [[decisions]] 2026-08-18.
  - **Graded from the recording, not the browser.** The audio is transcribed server-side (whisper)
    and THAT text is scored. The browser's Web Speech transcript is only an outage fallback and is
    never shown to a candidate.
  - **Grammar and vocabulary are capped at `accuracy + 25`** in code (`AiService.scoreSpeaking`).
    The examiner kept awarding both 100 on plainly broken utterances, reasoning that a repetition
    slip is not a grammar fault, and since they carry 30% between them that rescued answers which
    should have failed. Prompt wording alone did not hold; the ceiling does.
  - **Compound-word splits are never mistakes.** "sub-folders" spoken correctly comes back from
    whisper as "subfolders"; `forComparison` turns the hyphen into a space, so the strict rubric
    counted the join as a wrong word and docked a perfect read. The rubric now exempts spacing and
    hyphenation, and forbids tips about spelling — the candidate is speaking, not typing.
  - **Accent-fair by design.** Candidates are freshers speaking Indian English, so the examiner
    prompt marks intelligibility, not resemblance to an American or British speaker, and is
    forbidden from deducting for or commenting on the accent. The transcriber is also given the
    accent and domain as context so a correctly-read word is not written down as a different one.
  - **Pronunciation = intelligibility**: a target word the accent-robust transcriber recovered was
    clear enough (85-95); marks come off only where a word came back as a different,
    similar-sounding word. Capped at 95 — finer detail cannot be heard from a transcript.
  - **Fluency and confidence are NOT measured** — nothing in the pipeline hears the voice itself, so
    they are held at a neutral 60-75. Azure Speech (the only path that could score pronunciation
    acoustically) was removed in `5588da3`. Measuring fluency from whisper's timings was tried and
    rejected — see [[decisions]] (2026-08-18).
  - **Every genuine error is itemised** in a `mistakes` array (added 2026-09-01), each entry
    quoting what was said, giving the correction and a short reason. The transcription evidence bar
    governs this list as much as the score: a near-homophone, an acoustic neighbour or a normalised
    number is left out entirely rather than teaching a candidate to fix something they never did.
    Spelling, hyphens, spacing and capitalisation are banned from it — the input is lowercased and
    de-punctuated before the examiner sees it, so there is nothing there to judge.
- **Writing** — 10-dimension rubric: grammar, clarity, vocabulary, tone, professionalism, structure,
  readability, completeness, spelling, conciseness — plus mistakes, suggestions, and an improved
  version. Section score = average of the 10 dimensions.
  - **`mistakes` is exhaustive, not a summary**: one entry per error however small — a missing
    article, a wrong preposition, a comma splice, a lower-case sentence start, a singular for a
    plural — each with the correction AND a plain reason, because a correction nobody understands
    teaches nothing. Corrections may never appear in `suggestions`; a correction hidden among the
    tips is one the candidate cannot count.
- **Strictness (2026-09-01).** Both examiners mark to tighter bands: one error of any size means a
  field is not 100, and three or more small errors keep a field at or below 84. What strict does NOT
  mean: inventing faults, deducting twice for the same fault across the ten writing fields, or
  marking anything the transcriber may have produced from correct speech. Expect scores on the same
  answer to sit a few points below what the earlier prompts gave; the pass mark stays 75.
- **Overall** — the README describes overall = mean of the three sections, but the **code does
  not compute a numeric combined score**; sections are tracked independently by design
  (`AttemptPolicy.java:9-14`, `AssessmentSession.java:18-21`). `buildOverall` only produces feedback
  text + weak area. Treat "overall = mean" as a doc/code discrepancy to resolve, not current behavior.
- **Weak area** = the lowest-scoring section (this IS implemented — `MockAiEvaluator.java:138-141`).
- **Pass mark = 75** per section → pass/fail status per section.

## AI scoring behavior
- With `OPENAI_API_KEY`: Speaking/Writing scored by OpenAI JSON-mode chat completion
  (`OPENAI_MODEL`, audio via `OPENAI_AUDIO_MODEL`).
- Without a key, or on any error: **`MockAiEvaluator`** returns structured, deterministic scores +
  feedback so the flow always completes. This fallback is a Critical Constraint.

## Attempts & proctoring
- Attempts are governed by `AttemptService` / `AttemptPolicy` / `SectionAttemptControl`; a **manager
  can grant an extra attempt** (`/api/manager/employee/{id}/grant-attempt`); an employee can request
  one (`/api/employee/request-attempt`).
- Sections are timed and lightly proctored: fullscreen/exam-mode, warning dialogs, and
  `ProctorEvent`s (`/api/proctor/event`). Intro videos are non-fast-forwardable (`LockedVideo`).
- Timers: overall **10 min** per section; per-question **60s listening / 30s speaking / 5m writing**.

## Notifications, comments, audit
- `Notification`, `ManagerComment` (managers annotate an employee's results), and `AuditLog`
  (security-relevant actions) round out the model.

## Seeded data (dev)
`data.sql` seeds departments/teams, managers + employees (reports each), and the Listening/Speaking/
Writing content banks — idempotently. Exact counts evolve; do not hardcode them in tests beyond what
a test explicitly seeds.

**Level 3 content is built on TWO SCENARIOS per item**, which is what distinguishes it from
Level 2 rather than mere difficulty. Every listening briefing covers two migrations running at
once and its questions cannot be answered by following only one; every speaking set moves from
one migration to a second and ties them together in the closing sentences; every writing prompt
is a customer raising two issues from two different migrations in one email, so a reply that
answers the louder one is incomplete — which is where the completeness score bites.

Both Level 3 writing pools are CUSTOMER REPLIES (`Customer Email` and `Escalation Reply`), unlike
Levels 1 and 2 where the second task is an internal document. The two pool names exist because
`ContentAssignmentService` splits on the category to guarantee two independent draws; they are
not two different kinds of writing.

The scenarios and vocabulary come from the migration documentation tool: Message (Slack, Teams,
Chat), Mail (Outlook, Gmail) and Content (Shared Drive, SPO, OneDrive) in their supported
directions, with the real limits of each — guest identities issued by the destination, delegates
needing one sign-in, labels that are not folders, links that become named members, path length,
native-format conversion, version history, delta passes and read-only cutoffs. US project
language throughout, and deliberately no office idiom (see the Level 2 note in [[decisions]]).

The Level 2 banks live in separate files under `resources/seed/`, listed in `application.yml`
under `spring.sql.init.data-locations` (a file not in that list is never executed):
`speaking-level2-sets.sql`, `listening-level2-stories.sql`, `writing-level2-prompts.sql`. They
guard on a `seed_state` marker rather than on row existence, because data.sql guards its own
Level 2 inserts with `NOT EXISTS (... WHERE level = 2)`, which is already true in production —
rows appended there would never load on a live database. Bump a marker key to push a revision.

Bank sizes are chosen against 100 candidates taking 2 attempts a year, which is 200 assignments
per section. Speaking and Writing are sized so no two candidates need ever share (201 disjoint
speaking sets; 201 email and 201 non-email prompts). Listening is deliberately smaller — 41
stories — because a story is ~300 words plus 10 questions and 200 could not be held to that
standard; each is heard roughly five times a year by different people. In every section
`ContentAssignmentService`/`SpeakingSetService` still guarantee that no individual candidate
repeats their own content.
