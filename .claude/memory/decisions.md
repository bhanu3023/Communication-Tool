# Architectural Decisions

Log of decisions and their rationale. Add an entry (dated, absolute) for any structural change, new
dependency, schema change, boundary exception, or naming/collision resolution.

## 2026-07-22 — gstack integration & command-name collision resolution
- Adopted **gstack** as the shared AI toolkit (global install at `~/.claude/skills/gstack`, not
  vendored). `.claude/` holds only project-specific guidance.
- The scaffold's generic `review` command was named **`team-review`** to avoid colliding with
  gstack's reserved `/review`. All references updated.
- `deploy` was **kept** (not removed) because the project has unique deploy logic — Docker Compose
  build/run + project-specific pre/post checks — that gstack's generic `/land-and-deploy` doesn't
  know. It wraps those steps and defers orchestration to gstack.
- **No pre-existing `.claude/commands` or `.claude/skills`** existed in the repo, so there were no
  other collisions to rename.

## Pre-existing project decisions (captured from repo/README/ARCHITECTURE)

### Auth: Azure ID token → application JWT (not resource-server)
- The SPA uses MSAL (auth-code + PKCE); the backend **validates the Microsoft ID token** via
  `AzureTokenVerifier` (lazy JWKS decoder) and issues its own HS256 app JWT.
- **Why:** keeps the backend stateless and lets it boot without a network round-trip to Azure at
  startup. `spring.security.oauth2.resourceserver` is deliberately **not** configured.
- **No client secret** is used (SPA validates-only flow) — correct for this design.

### Stateless API, CSRF disabled
- No cookies/session; CSRF protection disabled by design. Do not reintroduce session state.

### AI with deterministic mock fallback
- Speaking/Writing scoring calls OpenAI (JSON mode) when `OPENAI_API_KEY` is set; on **any** error it
  falls back to `MockAiEvaluator`. **Why:** the app must work end-to-end offline and never break on an
  AI outage. This is a Critical Constraint.

### Consolidated schema (20 spec tables → pragmatic model)
- Per-section detail tables were consolidated into `section_result` with a JSON `details` payload.
- **Why:** keeps the data model maintainable. (Spec→implementation mapping in README §7.)

### Seed data via idempotent `data.sql`
- Runs after Hibernate schema creation (`defer-datasource-initialization: true`,
  `spring.sql.init.mode: always`); each block inserts only when its table is empty.
- **Why:** safe to run on every boot; seeds departments/teams/managers/employees + content banks.

### Frontend port 5174 in Docker vs 5173 in dev  — watch-out
- Docker Compose maps the frontend to host **:5174** (→ nginx :80); `npm run dev` uses **:5173**.
- Keep `APP_CORS_ORIGINS` and `VITE_AZURE_REDIRECT_URI` consistent with whichever is served. The
  local `.env` sets `APP_CORS_ORIGINS=http://localhost:5174` (Docker), README quick-start references
  5173 (dev). Not a bug, but a frequent source of CORS/redirect confusion.

### Dev-login bypass behind a flag
- `APP_DEV_LOGIN_ENABLED` / `VITE_DEV_LOGIN` expose passwordless sign-in for seeded users; the
  endpoint only exists when enabled. **Must be `false`** outside local dev (security-critical).

### Hotjar session recording (2026-08-17)
- Third-party session recordings + heatmaps, loaded for EVERY signed-in user and identified by
  name, email, role and team (`frontend/src/utils/hotjar.js`).
- **Why:** a stated product requirement — the admin needs to see how members actually use the
  portal. Recordings are viewed on hotjar.com, so there is nothing to gate inside the app;
  "admin only" means only the admin holds the Hotjar login. Loading it for admins alone would
  record only the admin, which is why it is not conditional on role.
- **Alternative rejected:** surfacing the existing `audit_log` in an admin screen. It already
  captures logins, section starts/submits, proctor warnings and admin actions, needs no third
  party and no employee PII leaving the building — but it gives counts and timings, not
  recordings of the actual interaction, which is what was asked for.
- **Known cost, accepted deliberately:** employees are recorded while taking a graded
  assessment, and their identity is sent to Hotjar. Flagged twice before implementing and
  confirmed as a requirement. Unset `VITE_HOTJAR_SITE_ID` and nothing loads.
- Baked at BUILD time like every `VITE_` var, so changing it needs an image rebuild. If a CSP
  is ever added to `frontend/nginx.conf` (there is none today), `static.hotjar.com` and
  Hotjar's script/websocket origins must be allowed or recording silently stops.


### Candidates hear their recording instead of reading a transcript (2026-08-18)
- The speaking flow no longer shows a transcript to the candidate — not live while they speak, not
  on the results screen, and not in dashboard feedback. In its place they get an audio player: the
  take they just recorded, during the test, and the stored recording in feedback afterwards.
- **Why:** the transcript confused people. The live one came from the browser's Web Speech API,
  which drops the opening words while the mic is still coming up and is NOT what the score is based
  on, so the screen showed two competing texts — the sentence they read and a recognizer's version
  of it — and invited candidates to argue with the wrong one. The recording is what gets evaluated,
  so the recording is what they are shown.
- Managers keep the transcript (`managerView`): reading ten answers is faster than listening to ten,
  and they are reviewing evidence rather than acting on feedback.
- The recognizer still runs, unseen, purely as the outage fallback for scoring. Its error toasts are
  now suppressed unless the fault also breaks the recording (mic blocked / no mic captured) —
  warning about the recognizer's own network trouble sent candidates chasing a fault that does not
  affect their result.

### Speaking is scored accent-fair for Indian-English freshers (2026-08-18)
- The examiner prompt now states the speaker is an Indian-English speaker early in their career,
  forbids deducting for or commenting on the accent (mother-tongue influence, syllable-timed
  rhythm, v/w, th/d/t, retroflex consonants, Indian business phrasing), and forbids the words
  "accent" and "mother tongue" in tips. Marks still come off for missing, added or wrong content
  words — verified this did not become a free pass.
- **Pronunciation is redefined as intelligibility** (85-95 when every content word was recovered,
  deductions only where a word came back as a different similar-sounding word, capped at 95). The
  transcriber is accent-robust, so a word it recovered was clear enough to be understood. This
  replaced a flat neutral 60-75 and is the one thing about the voice this pipeline can evidence.
- The transcriber also gets the accent and domain as context (`OpenAiClient.ACCENT_PROMPT`), so a
  correctly-read word is less likely to be written down as a different word and marked wrong. The
  target sentence is deliberately NOT in that prompt — whisper treats the prompt as preceding
  context and would complete text nobody spoke.

### Rejected: measuring fluency from whisper's timings (2026-08-18)
- Built and then removed: whisper `verbose_json` returns clip duration and segment timings, so
  fluency was scored from words-per-minute over the actual speech span (excluding the silence
  either side of pressing Record/Stop).
- **Why rejected — measured, not assumed.** On this content the number mostly reports SENTENCE
  LENGTH, not fluency. Read at a normal pace, a 3-word sentence measures ~80 wpm while a 12-word
  one measures ~150; whisper's segment timings are also coarse (~0.5s), which is a large fraction of
  a 2-second clip. A candidate reading a short sentence perfectly well scored fluency 76 while a
  deliberately slowed clip scored 95. Shipping it would have put sentence length into the grade —
  the opposite of the fairness this change was for. TTS also refuses to speak convincingly slowly,
  so there was no way to calibrate the slow/fast ends honestly.
- **What would work instead:** Azure AI Speech pronunciation assessment (hears the voice; needs a
  key — removed in `5588da3`), or mid-sentence pause detection from word-level timestamps, which is
  length-independent but still needs real candidate recordings to calibrate a fair penalty.
- Fluency and confidence therefore stay at a neutral 60-75 on token weight (3% and 2%). Their
  weights were NOT raised, because nothing new is being measured.

### Exam plays the audio, feedback shows the text (2026-08-18, supersedes the entry above)
- Reversal of half of the earlier decision, on the user's instruction. The recording player stays
  in the TEST, where the candidate can still act on it by re-recording. It is removed from
  FEEDBACK — dashboard, manager view and the results screen — and feedback shows the server-side
  transcription of the recording instead, for candidates as well as managers.
- **Why:** playback in feedback fetched the stored audio over `GET /api/speaking/recording/...`
  and does not work in production, so the control sat there without ever playing anything. In the
  test the audio is still in the browser and needs no round trip, which is why that one works.
- The transcript shown is whisper's, never the browser's, and is the same text that was scored —
  so feedback on a spoken answer is checkable rather than a bare number. `RecordingPlayer` and its
  imports were deleted; audio is still captured and stored and the endpoint still exists.

### Accent-fair is not the same as lenient (2026-08-18)
- The user reported the evaluation was biased and wanted every mistake marked. Measured it: a
  sentence read with three wrong words out of eight came back at 73.9 with grammar and vocabulary
  both 100, because the examiner reasoned a repetition slip is not a grammar fault. With those two
  carrying 30% of the grade, that quietly rescued answers that should have failed.
- Fixes, in the order they were needed: the rubric now walks the target word by word and must name
  every difference; grammar/vocabulary are scored on the utterance as heard; and — because prompt
  wording held on some sentences and not others — **grammar and vocabulary are capped at
  `accuracy + 25` in code**. The same case now scores 62.1 with all three errors named. The cap has
  no effect on a correct read.
- **Regression this introduced, and the fix:** telling it to account for every difference made it
  mark COMPOUND-WORD SPLITS. A perfectly read "sub-folders" comes back from whisper as
  "subfolders", `forComparison` turns the hyphen into a space, and a flawless answer lost 10 points
  plus a nonsensical tip. The rubric now exempts spacing/hyphenation and forbids tips about
  spelling at all: the candidate is speaking, not typing, and cannot pronounce a hyphen.
- Also floored the collapse to zero: accuracy 0 is reserved for a response with nothing
  recognisable in it, so a half-right answer scores in between rather than the same as silence.

### Level 2 speaking content: expressive, and ramped like Level 1 (2026-08-18)
- Level 2's ten sentences were all flat statements — **zero exclamatory sentences** — so nothing in
  the test asked a candidate to sound anything other than level. Three of the ten now carry
  exclamation and expressive words (outstanding, flawlessly, fantastic), and the set ramps 2 -> 33
  words, one line up to three.
- Level 1 was measured before changing anything and already does both: all 100 sets ramp from
  2-4 words to ~35, and every set already contains 1-4 exclamatory sentences ("Brilliant!", "Wow!",
  "Fantastic, data moved!"). No Level 1 content was touched.
- Expressive is not the same as obscure — the earlier decision to strip business idiom for these
  freshers still stands, so the new words are ones a first-year employee already knows.
- Seeded under its own marker `l2-speaking-expressive-v1` rather than bumping `l2-content-v2`,
  which would also have wiped and reseeded the Level 2 writing prompts for no reason.

### Local-only: Abhinav in the employee experience with Level 2 open (2026-08-18)
- For testing, `users.role` is set to EMPLOYEE with `manager_id = 1`, plus one seeded passing
  Level 1 attempt per section (85) so `AttemptPolicy.levelUnlocked` opens Level 2. Nobody else is
  affected. Scripts live in the session scratchpad, deliberately not in the repo.
- **Two traps:** the role is in the 8-hour JWT and this lineage has no per-request role resolution
  (Manmadha's `EffectiveRoleResolver` was reverted in `e50e4fa`), so he must sign out and in again;
  and `data.sql`'s root-admin re-assert hardcodes his email, so EVERY backend restart puts him back
  to ADMIN and the SQL has to be re-run.

### Writing time raised to 5 min reading + 10 min writing per task (2026-08-18)
- Was 2 minutes reading and 6 minutes writing per task; now 5 and 10. Both are PER TASK and there
  are always two tasks (one email + one other), so an attempt runs 30 minutes instead of 16.
- `OVERALL_SECONDS` was moved to 1200 to stay equal to the per-task writing time summed. The
  writing screen never reads it — it runs a banked per-task timer with no overall countdown — so the
  old 720 was a second, contradictory budget sitting in the API response.
- The on-screen copy is now DERIVED from the same numbers as the timers. It had already drifted:
  the intro promised "6 minutes to write" while the hub card said "5 minutes each" and the constant
  was 360. Hardcoded prose about durations is why nobody noticed.
- A "5 minutes left on this task" toast was added; a single 1-minute warning was thin on a 10-minute
  task, and matches what Listening/Speaking already do.

### Transcriber changed to gpt-4o-transcribe, measured on real candidate audio (2026-08-18)
- The user reported the transcript in feedback was inaccurate. It was. Measured properly instead of
  guessing, using the **20 real recordings already stored in `speaking_recording`** from two of
  their own Level 2 attempts, scored as word error rate against the sentence each was read against:

  | config | WER | word-perfect |
  |---|---|---|
  | whisper-1 | 16.4% | 4/20 |
  | whisper-1 + accent prompt | 15.8% | 5/20 |
  | gpt-4o-transcribe | 20.6% | 2/20 |
  | **gpt-4o-transcribe + accent prompt** | **13.0%** | 4/20 |
  | gpt-4o-mini-transcribe + prompt | 15.5% | 4/20 |

- **The prompt and the model have to move together.** gpt-4o-transcribe WITHOUT the accent prompt is
  the worst option of all (20.6%, worse than plain whisper); with it, the best. Do not remove one
  without re-measuring the other. `OPENAI_TRANSCRIBE_MODEL` default changed in `application.yml`,
  `docker-compose.yml` and the `@Value` fallback. This model rejects `response_format=verbose_json`.
- Verified end to end through the running backend on the real clips: "Count down the total
  permissions" became "Confirm the folder permissions" (accuracy 40 -> 80), and "Fantastic news",
  which whisper dropped entirely, came back (80 -> 90).

### The real accuracy problem is the capture, not the transcriber (2026-08-18)
- Diagnosed from the stored audio itself. In EVERY one of the 20 real recordings: the file peaks at
  exactly **-0.0 dBFS** (clipping), and begins with **exactly 300ms of digital silence** followed by
  speech at full level with no fade-in. Roughly half the clips then mis-transcribe at the OPENING
  words while the rest of the sentence is fine -- "Please confirm the folder" -> "Count down the
  total", "Fantastic news!" -> "Hashtag news", "If the customer" -> "Customer".
- Transcribing only the first 1.5s proves the damage is in the audio, not the model: it reads "Come
  from that floor over". Reducing the level by 6 dB and padding lead-in silence does not recover it.
- **Format and sample rate are NOT the problem.** Benchmarked the full browser chain (opus ->
  decode -> box-average to 16 kHz -> WAV) against sending the opus untouched and against 48 kHz WAV,
  across clean audio and audio degraded with noise, quiet and reverb: **all variants scored
  identically** (0.5% WER over 184 words). Whisper is loudness-invariant -- audio quietened 20 dB
  still transcribed word-perfect -- and noise-robust (0% at 10 dB SNR, 2.2% at 5 dB). So there is no
  case for changing the container, adding client-side normalisation, or resampling differently.
- Fixes shipped, both aimed at the opening words:
  1. **Explicit `getUserMedia` constraints** disabling autoGainControl, noiseSuppression and
     echoCancellation. The clipping is AGC driving the signal to full scale, and clipping distorts
     the stressed syllables a transcriber depends on. Since transcription is provably indifferent to
     level and robust to noise, that processing can only remove detail.
  2. **The recorder starts first and settles before the recognizer touches the microphone**, and the
     UI does not say "Listening" until the encoder has delivered its first chunk plus a 400ms
     settle. Two capture streams were being opened simultaneously, so the device was being
     reconfigured underneath the recorder exactly as it began capturing.
- **Unverified:** both capture fixes need a real browser and microphone to confirm; they cannot be
  reproduced in this harness. The model change IS verified. Re-run the WER measurement on recordings
  made AFTER these fixes to see whether the opening-word errors actually go away.


### Hotjar site id resolved at runtime, never hardcoded (2026-08-20)
- The Hotjar site id is no longer read straight from the build-time `VITE_HOTJAR_SITE_ID`. A new
  `frontend/public/runtime-config.js` sets `window.__APP_CONFIG__` before the bundle loads, and
  `frontend/src/utils/runtimeConfig.js` resolves runtime-first, build-time-second.
- **Why:** Vite freezes `VITE_*` vars into the bundle, so the previous setup meant a bundle built
  without an id could never be switched on, and one built with an id could never be switched off,
  without rebuilding the image. The 2026-08-17 entry already flagged this as a known cost. `public/`
  is copied verbatim, so this one file is editable on a deployed server with no toolchain.
- **No id is committed.** The tracked file holds a `__HOTJAR_SITE_ID__` placeholder. The resolver
  treats the `__NAME__` shape as unset, so an unsubstituted placeholder falls through to the
  build-time value rather than being requested as a literal id. Both unset = Hotjar fully off.
- **Asymmetry to know:** writing an id into `runtime-config.js` turns recording ON for a bundle
  built without one. Writing `""` there cannot turn it OFF, because a blank runtime value falls
  through to the baked-in build value. Disabling a bundle with an id baked in needs a rebuild.
- **Alternative rejected:** committing the real id. It is not a secret (it ships in client-side JS),
  so this was defensible, but it hardcodes an environment-specific value into the repo and gives
  every deploy the same id whether it wants recording or not.
- **Resolver placed in `utils/`, not a new `config/` folder** — `.claude/rules/architecture-boundaries.md`
  bars new frontend top-level folders without an architect decision.
- **Not done:** no automated test. The frontend has no test runner, and adding Vitest is a new
  dependency needing its own decision. `initHotjar()` now returns a boolean specifically so that
  test, when it exists, can assert the off/on/idempotent/non-numeric cases.

### Hotjar site id supplied by GitHub Actions, not the server (2026-08-20)
- The id now comes from the repo **variable** `HOTJAR_SITE_ID`. `deploy.yml` validates it
  (digits-only, fails the deploy otherwise) and passes it as a 4th argument to
  `deploy-remote.sh`, which exports `VITE_HOTJAR_SITE_ID` before `docker compose build`.
- **Why:** the build runs ON the server, so the value previously had to be in the server's
  `.env` — which needs shell access nobody on the team currently has. A repo variable makes it
  changeable by anyone with repo settings access.
- **Variable, not a secret, deliberately:** the id ships in client-side JS that any visitor can
  read. Masking it in Actions logs protects nothing and makes deploy output harder to read.
- A shell variable takes precedence over the same key in the server's `.env`, so the GitHub value
  wins without the `.env` needing to be touched or even to contain the key.
- The 4th argument is `${4:-}`, so the script still runs under `set -u` if an older workflow
  passes only three arguments. Unset variable = empty build arg = Hotjar fully off.


### Listening and Writing content pinned per session, and Level 2 banks resized (2026-09-01)
- **What broke:** Listening and Writing drew their content at random on *every* call to `start`,
  recorded nothing on the session, and consulted no history. Two faults from one cause: a reload
  mid-attempt handed the candidate different questions, and a retake could serve the same content
  again. Level 2 made it certain rather than likely — it held **one** listening story and **two**
  writing prompts, so every Level 2 candidate met identical content.
- **Fix:** `ContentAssignmentService`, mirroring `SpeakingSetService` — choose once, write the
  choice onto `AssessmentSession`, exclude what the candidate has had before, otherwise take the
  least recently served item. `ContentService` lost its selection methods entirely (removed, not
  deprecated, so nothing can reach for the unpinned behaviour again) and is now shared vocabulary.
- **Sizing decision, and where it differs by section.** Speaking and Writing are sized for full
  disjointness across a year — 201 sets, 201 email prompts, 201 non-email prompts against 200
  expected assignments — so no two candidates need ever share. Listening is **not**: 41 stories,
  each heard about five times a year by different people.
- **Why the asymmetry:** a speaking set is ten sentences and a writing prompt is a paragraph;
  a listening item is a ~300-word script plus 10 inference questions. 200 of those could not be
  authored to the standard the existing ones set, and a large bank of weak stories is worse than
  a smaller bank of good ones. The per-candidate guarantee — nobody repeats their own content —
  holds in all three sections regardless, because it comes from the exclusion rule, not the size.
- **Alternative rejected:** generating listening stories from a template with substituted names
  and numbers. It would have reached 200 cheaply and produced 200 recognisably identical tests,
  which defeats the purpose of not repeating.
- **Answer keys are balanced deliberately.** The first draft of the 400 new listening questions
  came out 69% B, so a candidate answering B throughout would have scored 69. Keys are now
  distributed per story (no letter more than 3 times in a set of 10) and evenly across the bank.
- **New columns are nullable:** `listening_story_id`, `writing_email_prompt_id`,
  `writing_other_prompt_id`. `ddl-auto=update` cannot add a NOT NULL column to a populated table,
  and attempts predating the columns legitimately have no value.
- **Verified** by booting the backend against a throwaway Postgres: 41 Level 2 stories, 410
  questions (every story exactly 10), 201 + 201 writing prompts, and a second boot changed no
  counts, which is the seed-guard check.


### Stricter examiners, and every small mistake itemised with a reason (2026-09-01)
- **Asked for:** a stricter English evaluator, and feedback that shows the small mistakes and
  explains them rather than passing over them.
- **Two separate changes, deliberately.** Strictness is a SCORING change: the bands tightened so
  one error of any size stops a field reaching 100, and three or more small errors hold a field at
  or below 84. Showing the small mistakes is a FEEDBACK change: both examiners now return an
  itemised `mistakes` array, one entry per error, quoting it, correcting it and giving a plain
  reason. Conflating the two would have meant either silent deductions or noisy nit-picking.
- **`SpeakingEvaluation` gained a `mistakes` component** to match Writing, rendered in both places
  speaking feedback appears (`AttemptReview.jsx`, `assessment/Speaking.jsx`). Older attempts have
  no such key, so every reader guards with `Array.isArray`.
- **Corrections may no longer appear in `suggestions`.** Before the change the writing examiner put
  half its corrections in the tips, so a candidate reading the mistakes list saw an incomplete
  record. Tips now name the PATTERN behind the errors; the list carries the corrections. Measured
  on the same answer: mistakes went 3 -> 4 and the tips stopped duplicating them.
- **What strict does NOT relax: the transcription evidence bar.** Speaking is marked from a
  transcript with ~13% WER, so the prompt still forbids marking — or listing — anything that could
  be the transcriber mishearing correct speech, and still bans spelling, hyphen, spacing and
  capitalisation entries because the text is lowercased and de-punctuated before it is seen. This
  is not theoretical: the first draft of the stricter prompt produced "you said 'before thursday',
  say 'before Thursday'" on lowercased input. Repeating the ban inside the mistakes instruction,
  rather than only at the end of the prompt, removed it.
- **Verified against the live model**, not by reading the prompt: a script parses the concatenated
  Java literals out of `AiService.java` and calls gpt-4o-mini with them, so what is tested is what
  ships. A speaking answer with two small errors returned exactly those two, each with a reason,
  and grammar/vocabulary 80 rather than the 100 the old bands invited. A writing answer with four
  small errors returned all four and averaged 80.5-83.
- **Trap worth recording for anyone repeating that check:** extracting the prompt must start at the
  OPENING quote of the literal, not at a marker inside it. Starting mid-literal makes the closing
  quote read as an opening one, silently dropping every other literal — half the prompt. The first
  run did exactly that and produced a writing response with no numeric fields at all, which looked
  like a serious regression and was an artefact of the harness.
- **Consequence to expect:** the same answer now scores a few points lower than it did last month.
  The pass mark stays 75, and an employee comparing a new attempt against an older one is comparing
  against a more lenient examiner — the improvement delta shown in feedback is not like-for-like
  across this date.
- **Also corrected here:** `architecture.md` still documented the pre-`a10c3be` speaking weights
  (acc 60 / gram 15 / vocab 15 / pron 5 / flu 3 / conf 2). The code has used acc .30 / gram .22 /
  vocab .18 / pron .20 / flu .05 / conf .05 since that commit.


### A mistake is an error, not a preference — and what a real attempt showed (2026-09-01)
- Follow-up to the stricter-examiner entry above, after taking a REAL attempt (writing and
  speaking) against a backend built from that commit, with the live key and real TTS audio.
- **The mistakes list was accepting three things it should refuse**: a synonym swap of correct
  wording ("finished" -> "complete"), a stylistic preference ("very high" -> "significant"), and
  content the answer failed to cover ("the email does not address..."). The prompt now says a
  mistake is something WRONG rather than a phrasing the examiner prefers, forbids synonym swaps
  outright, and sends anything the answer failed to SAY to completeness and a suggestion instead —
  a candidate cannot fix a missing fact by rewriting the words they used.
- **Most of that noise turned out to be my test, not the prompt.** Every attempt now draws
  different prompts (the content-assignment change working as designed), while the harness kept
  submitting the same two answers — so from attempt two onwards the examiner was correctly
  reporting that the answer did not address the scenario it had been given. Pinning scenario and
  answer removed nearly all of it. Worth remembering: an end-to-end attempt can no longer be
  re-run with fixed answers, and a prompt A/B has to pin both sides.
- **Measured, scenario pinned, six errors planted in one answer:** gpt-4o-mini found 5 with ZERO
  false entries and was identical across runs; gpt-4o found 6 but added a stylistic entry each
  run ("Regards," -> "Best regards,"). Staying on gpt-4o-mini: for a list a learner reads, a
  wrong entry costs more than a missed one, and it is a fraction of the price.
- **Speaking verified end to end**, which had never been done for this path: the target sentence
  was synthesized with a deliberate tense slip (OpenAI TTS), uploaded as a take, transcribed by
  gpt-4o-transcribe and scored. It returned exactly one mistake — you said "move", say "moved" —
  with grammar 85, and zero mistakes on the sentence read correctly. No spelling or capitalisation
  entries appeared despite the transcript being punctuated, which is the artefact ban holding.
- **Level 2 could not be exercised through the app**: it is gated behind a best score of 75 in all
  three Level 1 sections, so the new Level 2 banks were verified by seeding and by direct prompt
  runs, not by an attempt.


### Level 3 shipped as plumbing first, with a UI that is not Level 2's (2026-09-02)
- **Asked for:** Level 3 at code level, in both portals, with a better UI than Level 2 and no
  reuse of the templates already in the app — and, explicitly, no change to Level 1 or Level 2,
  which are working in production. Questions to follow later.
- **Rules chosen with Abhinav:** pass mark 85, 2 attempts per section, and Level 3 opens when all
  three Level 2 sections are passed — the same shape as the Level 1 -> Level 2 gate.
- **The gate was generalised rather than special-cased.** `levelUnlocked` now checks the level
  directly below instead of hard-coding Level 1, and `lockedMessage` names that level and its
  pass mark. For Level 2 both produce byte-identical results, including the sentence a candidate
  reads on a locked portal — that wording is load bearing and is asserted in the verification run.
- **`nextLevelUnlocked` now means "the level above this one"**, which is what its name always
  said. At Level 1 that is unchanged; at Level 2 nothing consumes it, so nothing moved.
- **Content ships separately, and the app says so.** Level 3 has no seeded questions yet, so
  `ContentReadinessService` + `GET /employee/level-readiness` report per-section counts and the
  portal disables Start with "questions not published yet". Without it the first candidate to
  reach Level 3 would spend an attempt to discover a 404 from the content selector. Levels 1 and
  2 never call it, so their paths carry no extra query.
- **The Level 3 UI deliberately shares no component with Level 2.** Levels 1 and 2 are hero +
  three tiles + history table; Level 3 is a console — a command bar that always states where you
  stand and what to do next, a rail of the three sections, and one detail panel with room for
  numbers a tile could not hold. Reasoning: three equal tiles say "here are three things", but at
  the top level the useful question is "what do I do next and how close am I", which is a focus
  problem rather than a grid problem.
- **Its accent is the true CloudFuze blue (#0129AC)** — see [[cloudfuze-brand]]. The app theme is
  still the off-brand indigo and was NOT touched, because that would restyle every Level 1 and 2
  screen. Level 3 is the one surface wearing the real brand colour, which also makes the top of
  the ladder the only place the brand colour is the reward.
- **Verified against a running backend**, 27 checks: Level 3 exists, is gated, reports zero
  content, and opens once three Level 2 passes are simulated; Level 1 and Level 2 keep their
  pass marks, attempt counts, gate behaviour and exact locked-message wording; the manager team
  and detail endpoints answer at level 3 with the new fields and the old ones intact.
- **Not verified: the Level 3 screen in a browser.** Sign-in is Azure-only, so there is no way to
  render an authenticated page without Abhinav's session. The build passes and every JSX
  identifier in the changed files was swept against its imports (the check that would have caught
  the `BrandLogo` breakage in August), but nobody has looked at it yet.


### Level 3 content: two scenarios per item, grounded in the migration doc tool (2026-09-02)
- **Asked for:** Level 3 questions built on TWO scenarios rather than one, deeper migration
  terminology than Level 2, US business English, and writing tasks that are professional replies
  to customer mail — using the combinations in the migration documentation tool as the source.
- **Where the domain came from.** `github.com/mosrabhuvanakruthi2-art/Doc-Tool` documents three
  products and 20 combinations: Message (Slack, Teams, Chat), Mail (Outlook, Gmail) and Content
  (Shared Drive, SPO, OneDrive), each with an In Scope and an Out of Scope feature list. The repo
  carries only the combination NAMES — every feature detail lives in a MongoDB nobody exported —
  so the scenarios here are written from the combinations plus the real platform limits, not
  copied from that tool content.
- **Two scenarios is the actual design, not a difficulty knob.** Each listening briefing runs two
  migrations for one customer and the questions cannot be answered from one thread; several ask
  which of the two an event belonged to, and one is arithmetic across both. Each speaking set
  spends five sentences on the first migration, four on the second, and a long tenth tying them
  together, so the candidate switches context mid-set and then holds both at once. Each writing
  prompt is a customer raising two issues from two different migrations, so a reply that answers
  the louder one scores badly on completeness — which is the field that already exists for it.
- **Both writing pools are customer replies** (`Customer Email` and `Escalation Reply`), where
  Levels 1 and 2 pair a customer email with an internal document. The second pool name exists
  because `ContentAssignmentService` splits on category to get two independent draws; the two are
  not different genres. The escalation pool is where the customer is unhappy, is escalating over
  the writer head, or is asking for something that cannot be given — the writing a fresher is
  least ready for and the writing that carries the commercial risk.
- **Sizes:** 16 briefings with 160 questions, 30 disjoint speaking sets with 300 sentences, and
  100 writing prompts in two pools of 50. Sized for the population that actually reaches a level
  gated on three Level 2 passes, and extendable by adding set numbers or rows.
- **Answer keys were rebalanced after drafting**, as at Level 2: the first draft ran 105 of 160 on
  B. They are now even across the bank and no letter appears more than three times in any set of
  ten.
- **The speaking floor was raised from 10 words to 15.** Thirty sentences had come out at 10-14
  words — set openers and the pivot into the second scenario. A ten-word sentence has no clause to
  hold together, which is the same criticism recorded against the old Level 2 opener, so each was
  rewritten to carry its information plus the detail the candidate must keep straight.
- **No office idiom, deliberately** — the Level 2 entry above records why it was removed: it tested
  vocabulary nobody had been taught. What IS used is learnable US project language named plainly in
  context: kickoff, statement of work, change request, dry run, UAT, go-live, cutover window,
  blackout period, punch list, hypercare, escalation path, root cause analysis, run book.
- **Verified end to end** against a throwaway database: the banks seed to the expected counts, the
  Level 2 banks are untouched, readiness flips to ready, and a real attempt started on all three
  sections — listening serving a two-migration briefing with 10 questions, speaking serving a set
  that climbs from 15 words to 77, and writing serving one prompt from each pool.


### Level 3 Speaking becomes a spoken-ANSWER test (2026-09-02)
- **Asked for:** Level 3 speaking questions built on two connected migration workstreams, deep
  enough that terminology alone cannot answer them, with the candidate reasoning aloud.
- **The conflict that had to be surfaced first.** Speaking was a REPETITION task at every level: a
  sentence appears, the candidate reads it, and the score comes from comparing the transcript with
  that sentence. An analytical question has no target text, so seeding those questions into the
  existing pipeline would have shown a 120-word scenario and scored the candidate on how exactly
  they read it aloud. The questions would have been good and the scores meaningless. Abhinav
  confirmed the intent: the recording is listened to by the AI, which returns feedback and
  mistakes -- an answer test.
- **What changed, and what deliberately did not.** `AiService.scoreSpokenAnswer` is a second
  scoring path, given the QUESTION rather than a target sentence, and told to judge whether the
  answer answers it with sound migration reasoning. `SpeakingService` picks the path on the
  session level, so Levels 1 and 2 keep the repetition prompt, the 15-minute clock and their
  banks exactly as they are. The same six dimensions come back from both paths, so the weighting,
  the DTO, the manager view and the feedback screen needed no change at all -- only what the
  dimensions MEAN shifts, and the prompt says so: accuracy carries the answer rather than the echo.
- **The mock fallback needed its own path, and this matters.** The repetition fallback scores word
  overlap with the target. Reusing it here would have scored a candidate who simply read the
  question back as a perfect answer. `MockAiEvaluator.scoreSpokenAnswer` therefore does not compare
  at all: it scores conservatively on length, says plainly that automatic scoring was unavailable,
  and leaves the answer for a human.
- **Five questions per set, not ten, and 25 minutes rather than 15.** An analytical answer runs one
  to two minutes; ten would have made a fifty-minute section.
- **Verified by scoring two real answers to the same question** through the whole pipeline: an
  answer that restates the scenario scored 30 on accuracy, and one that names the dependency,
  proposes a measurement and gives a recommendation scored 90. The section can therefore tell them
  apart, which is the entire point of the level.
- **Also fixed here:** `strings()` now drops blank entries from any model array. The examiner
  occasionally returned an empty mistakes slot, which rendered as an empty bullet and read as a
  fault in the app rather than in the answer.
- **Question design rules**, applied to all 60: two connected workstreams in every one, at least
  two sentences of concrete scenario before the ask, the cause never stated in the question, no
  pairing of platforms used twice, and the failure patterns rotated so path length, external
  identity and permissions each appear once or twice rather than everywhere. Types are mixed --
  troubleshooting, root cause, sequencing, risk triage, go or no-go, cutover coordination,
  post-migration investigation, explaining a limitation to a non-technical customer, dependency
  analysis, recommendation.


### Level 3 content, second pass: a length ladder and no recall questions (2026-09-02)
- **Speaking questions now climb inside a set** -- roughly two lines, two and a half, three, three
  and a half, four (30 / 38 / 45 / 52 / 60 words). The first cut ran 56 to 100 words in no order,
  and a candidate who meets a hundred-word scenario cold spends their opening thirty seconds
  reading rather than thinking. Same warm-up principle as the Level 1 and Level 2 sentence sets.
- **Trade-off recorded:** the earlier rule was two full lines of SCENARIO and then the ask, which
  does not fit in a two-line question. Q1 and Q2 carry one tight scenario sentence plus the ask;
  from Q3 there are two or more full lines of scenario first. The ladder wins at the short end.
- **The listening bank had 24 questions that tested memory rather than listening** -- how many
  documents carried labels, how long the vendor took, what an option cost. A candidate answers
  those by holding a number for ninety seconds without following any of the reasoning. All are
  replaced by questions on implication, trade-off, consequence or the speakers own judgement,
  whose answers are present in the briefing but never as a sentence to recall.
- **Two kept deliberately:** sorting a DEFERRED problem from a resolved one is comprehension, not
  recall; and the one arithmetic item combines a figure from each of the two migrations, so it is
  a calculation across both rather than a memory of either.
- **Two of the replacements had to be replaced again** -- they landed next to an existing question
  on the same point. Ten questions on one briefing only work if each opens a different door, and
  that is easy to lose sight of when patching a bank rather than writing it.
- **Seed markers bumped** (listening to -v3, speaking questions to -v2) with delete guards, because
  a bank that is already seeded will not take a revision otherwise -- the row-existence guard is
  true and the insert is skipped. This is the third time that has come up; it is the standard shape
  for revising any seeded bank.
- Answer keys rebalanced again after the rewrites: even across the bank, never more than three of
  one letter in any set of ten.


### Performance pass: the SPA was served uncompressed, and the manager page waited on OpenAI (2026-09-02)
- **Reported:** lag signing in and lag in the manager portal. Measured both rather than guessed,
  and they turned out to be two unrelated causes, neither of them query time.
- **The app felt slow after login because nginx served everything uncompressed.** 1,040 KB of raw
  JavaScript on a cold load, with the browser advertising gzip and getting no `Content-Encoding`
  back. Asset names carry a content hash, so every deploy invalidates every cached chunk and each
  user pays the full download again -- which is exactly when somebody notices. `gzip on` with a
  sensible type list takes it to **325 KB over the wire, a 69% cut**. Configuration only: the
  bytes the browser ends up with are byte-identical.
- **The manager portal was waiting on a live OpenAI call before rendering anything.**
  `ManagerService.employeeDetail` called `AiService.buildOverall` unconditionally, and opening a
  team member with scores measured **4,995 ms cold** (8,038 ms on a second run -- OpenAI latency
  varies) against **77 ms warm**. Every other part of that page is a database read under 100 ms.
  The employee dashboard had the same fault and was fixed in the 2026-08-04 pass by making the AI
  call opt-in; the manager path was left behind.
- **Shaped so nothing existing could change.** The endpoint keeps `ai=true` as its default, so the
  report view and the PDF path -- both of which call the three-argument overload -- behave exactly
  as before; verified, both still 200 with the coaching present. Only the manager detail page opts
  out, renders in 77 ms, then fetches the coaching and merges it into the same panel. A
  stale-response guard covers a manager switching level while the slow call is in flight.
- **Checked and deliberately left alone:** the indexes are already right (someone added
  `idx_assessment_session_user_section_level_status` and the session-id indexes); the team filter
  already debounces at 300 ms and filters status client-side; the JWT filter does no database work
  per request; the post-login employee calls are all under 90 ms. Login itself is three queries.
  What remains in the sign-in path is MSAL round-tripping to Microsoft, which is not ours.
- **Local data is 16 MB against 215 MB in production**, so none of this was found by timing
  queries -- it was found by looking for fixed costs that small data cannot hide.
