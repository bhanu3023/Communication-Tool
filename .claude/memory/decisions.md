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
