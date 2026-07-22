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
  **pronunciation 30% · accuracy 25% · fluency 20% · grammar 10% · vocabulary 10% · confidence 5%**.
  Section score = average across the sentences. Optional real pronunciation scoring via Azure Speech.
- **Writing** — 10-dimension rubric: grammar, clarity, vocabulary, tone, professionalism, structure,
  readability, completeness, spelling, conciseness — plus mistakes, suggestions, and an improved
  version. Section score = average of the 10 dimensions.
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
