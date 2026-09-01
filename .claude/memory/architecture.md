# Architecture (project memory)

Mirror of the structural facts (long-form in `docs/ARCHITECTURE.md`; boundaries enforced by
`.claude/rules/architecture-boundaries.md`). Read this before scanning source.

## Request & auth flow
1. React SPA signs in with **MSAL** → receives a Microsoft **ID token**.
2. SPA calls `POST /api/auth/login { idToken }`.
3. `AzureTokenVerifier` validates the token against the tenant's **JWKS** and checks
   **audience == configured client id**.
4. `AuthService` provisions/updates the `users` row and issues an **application JWT** (HS256,
   `JwtService`) containing `uid`, `email`, `role`, `name`.
5. SPA stores it and sends `Authorization: Bearer <jwt>` on every call; `JwtAuthenticationFilter`
   authenticates and sets an `AppPrincipal` with `ROLE_EMPLOYEE` / `ROLE_MANAGER`.
6. **Stateless** (no cookies/session) → CSRF disabled by design. SQLi prevented by JPA binding; all
   input validated (Jakarta); sensitive actions written to `audit_log`.

## Backend layers (`com.cloudfuze.trainer`)
`controller → service (+ service.ai) → repository → entity`; supporting `dto`, `security`, `config`,
`exception`, `mapper`, `util`, `domain`.
- **service.ai**: `AiService` facade over `OpenAiClient` (JSON-mode chat) with deterministic
  `MockAiEvaluator` fallback — **any OpenAI error falls back to mock; the app never breaks**. Optional
  OpenAI speech-to-text (`AiService.transcribe`) turns the recording into the text that is graded.

## Modules
Three assessment modules (Listening / Speaking / Writing), each: controller `/api/<module>` →
`<Module>Service` → content-bank entity (`ListeningQuestion`+`ListeningStory` / `SpeakingSentence` /
`WritingPrompt`) + shared `AssessmentSession` & `SectionResult` (JSON `details`). Plus `ProctorController`
(`ProctorEvent`), `ManagerController`/`ManagerService` (team + PDF via `PdfService`), `DashboardService`,
`AttemptService`/`AttemptPolicy`/`SectionAttemptControl`.

## Levels
Three levels, each the SAME three sections at a higher bar. `AttemptPolicy` holds every
per-level number and the gate:

| Level | Pass mark | Attempts / section | Opens when |
|---|---|---|---|
| 1 | 75 | 2 | always |
| 2 | 80 | 2 | all three Level 1 sections passed |
| 3 | 85 | 2 | all three Level 2 sections passed |

`levelUnlocked(user, n)` checks only the level directly below, which is sufficient because
level n-1 could not have been passed without n-2 having been passed first. Adding a level means
two constants and an entry in the two switches — nothing else in the backend is level-aware.

Level 3 shipped (2026-09-02) with its content banks empty and they were seeded the same day:
16 listening briefings (160 questions), 30 speaking sets (300 sentences) and 100 writing prompts.
`ContentReadinessService` and `GET /api/employee/level-readiness?level=n` report per-section
counts, so a level whose questions are not written yet says so instead of letting a candidate
spend an attempt discovering it. Levels 1 and 2 never call it.

## Content selection (no repeats)
All three modules pick content the same way, and the choice is **pinned to the session** so a
reload mid-attempt cannot change it. `SpeakingSetService` does this for Speaking;
`ContentAssignmentService` does it for Listening and Writing. `AssessmentSession` therefore
carries `speaking_set_number`, `listening_story_id`, `writing_email_prompt_id` and
`writing_other_prompt_id` — all nullable, because `ddl-auto=update` cannot add a NOT NULL column
to a populated table and attempts predating them have no value. Selection rule: exclude anything
the candidate has already been served at that level, then prefer the item served least recently
across all candidates, so the bank spreads instead of clustering. Falling back to the whole pool
when a candidate has exhausted it keeps an attempt possible rather than failing it. Writing draws
its two tasks from two pools independently — a `Customer Email` prompt and a non-email one.

## Scoring (see [[domain-knowledge]])
- Listening: MCQ, 10/correct (max 100), deterministic AI summary.
- Speaking is TWO different assessments behind one section. Levels 1-2 are a repetition task: a
  sentence appears, the candidate reads it aloud, `AiService.scoreSpeaking` compares the transcript
  with it. **Level 3 is a spoken-ANSWER task** (2026-09-02): a two-workstream scenario appears with
  a question, the candidate answers in their own words, and `AiService.scoreSpokenAnswer` judges the
  answer -- the dependency found, blockers separated, a recommendation given -- with no model text
  to compare against. `SpeakingService` picks the path on the session level, and the same six
  dimensions come back either way so the weighting, DTO, manager view and feedback screen are
  untouched. What they MEAN shifts: accuracy carries the answer at Level 3, the echo at Levels 1-2.
  Level 3 also gets 25 minutes rather than 15, and 5 questions per set rather than 10 sentences.
- Speaking: weighted rubric acc .30 / gram .22 / vocab .18 / pron .20 / flu .05 / conf .05; section
  = average. (The old acc 60 / gram 15 / vocab 15 / pron 5 / flu 3 / conf 2 split measured recall,
  not English, and was replaced when the Level 2 sentences grew past 50 words.)
  Scored from the server-side transcription of the recording (whisper), never the browser transcript.
  The rubric is accent-fair for Indian-English freshers: pronunciation is judged as intelligibility
  (capped 95), while fluency and confidence cannot be heard at all and are held near 70 on token
  weight. In the TEST the candidate plays back the take they just recorded; in FEEDBACK they read the
  transcript of it and there is no player (see [[decisions]]).
- Writing: 10-dimension rubric average + mistakes/suggestions/improved version.
- Both AI-scored sections return a `mistakes` array beside `suggestions`: every error the examiner
  is confident the candidate made, one entry each, quoted with its correction and a short reason.
  The two arrays are deliberately different jobs — `mistakes` is the complete record of what was
  wrong, `suggestions` teaches the pattern behind it and never repeats a correction. Speaking gained
  the field in 2026-09-01; attempts recorded before that have no such key, so every reader guards
  with `Array.isArray`.
- Weak area = lowest section; **pass mark = 75** per section (pass/fail status). NB: README says
  "overall = mean of sections" but the code does not compute a numeric combined score — sections are
  independent by design (see [[domain-knowledge]] / [[decisions]]). Doc/code discrepancy to resolve.

## Timers
Listening and Speaking: **overall 10 min** (toast at 5m/1m/10s, auto-submit at 0) plus per-question
(60s listening; Speaking has no per-sentence timer). Writing is different: **no overall timer** --
each of the 2 tasks gets **5 min reading** (no typing) then a **banked 10 min writing** timer, and
only the active task's time ticks down (`WritingService.THINKING_SECONDS`/`QUESTION_SECONDS`), so an
attempt runs 30 min. `overallSeconds` is still sent for Writing but the screen ignores it.

## Persistence & config
PostgreSQL 16; Hibernate `ddl-auto: update`; `defer-datasource-initialization: true` runs
**idempotent** `data.sql` after schema creation. Azure resource-server is intentionally NOT configured
in `application.yml` — tokens are verified lazily by `AzureTokenVerifier`.

## Frontend
`pages/{employee,assessment,manager}` → `components/`, `hooks/`, `contexts/` (`AuthContext`,
`ToastContext`), `services/` over single axios instance `services/api.js` (Bearer token + 401 →
`/login`). Routes guarded by `ProtectedRoute`. MUI + `theme.js`. MSAL config in `authConfig.js`.

## Deploy topology
Docker Compose: `db` (postgres:16) · `backend` (Spring Boot, :8080) · `frontend` (nginx, host **:5174**
→ :80). See [[decisions]] for the 5173/5174 port note.
