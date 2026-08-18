# Progress

Snapshot of what's built, what's missing, and known watch-outs. Update when status changes (dated,
absolute).

## Done (as of 2026-07-22)
- Full layered backend (Spring Boot 3 / Java 21): auth (Azure→app JWT), all three assessment modules,
  sessions/scoring, attempts, proctoring, manager reporting + PDF, dashboards, audit log.
- AI facade with OpenAI JSON-mode scoring + deterministic `MockAiEvaluator` fallback. (Azure Speech
  pronunciation scoring was later removed — `5588da3`; speaking is graded from a whisper
  transcription of the recording.)
- React 19 + Vite frontend: MSAL login, role-guarded routing, employee/assessment/manager pages,
  timers, audio recorder, exam-mode/proctoring, intro videos.
- PostgreSQL schema (Hibernate `ddl-auto: update`) + idempotent `data.sql` seed. Swagger. Docker
  Compose for all three services.
- Recent commits: 75 pass mark per section w/ pass/fail; non-fast-forward intro videos; seeded
  managers/employees; full-page Microsoft redirect sign-in; Abhinav set to employee.

### Speaking review + accent fairness (2026-08-18)
- Candidates no longer see a transcript anywhere in the speaking flow — they play back their own
  recording instead, both during the test and in feedback. Managers keep the transcript.
- The examiner and the transcriber are both told the speaker is an Indian-English fresher;
  pronunciation is scored as intelligibility. Verified end-to-end against real synthesized speech: a
  forged client transcript never reaches the score, a correct read lands ~98, a trailed-off sentence
  ~74 with the missing words named, and a wrong sentence ~3.

### Speaking: exam plays audio, feedback shows text (2026-08-18)
- The recording player in feedback fetched the stored audio from the server and does not work in
  production, so it is gone from feedback (dashboard + manager) and from the results screen. The
  player now lives only inside the test, where the audio is still in the browser.
- Feedback instead shows the server-side transcription of the recording -- the same text that was
  scored -- for candidates and managers alike.
- Intro instructions gained a "Wait one second" step: the mic needs a moment, and speaking before
  it says "Listening..." cuts off the first word.
- Rubric tightened after finding it rounded flawed answers up; grammar/vocabulary are now capped at
  accuracy + 25 in code. Compound-word splits and spelling are explicitly not mistakes.
- Level 2 speaking content revised: ramps 2 -> 33 words (one line to three) and three of the ten are
  exclamatory with expressive words. It previously had none. Seed marker `l2-speaking-expressive-v1`.

## Not done / known limitations
- **No automated tests yet** — `backend/src/test` does not exist; no frontend test setup. Test deps
  are present in `pom.xml`. First tests should target the deterministic scoring core + AI mock
  fallback + role isolation (see `.claude/rules/testing-standard.md`, `testing-patterns` skill).
- **No CI/CD pipeline** in the repo (no `.github/workflows`). Deployment is manual Docker Compose
  (`/deploy` command).
- AI prompt tuning and some edge behaviors use solid defaults intended to be refined iteratively.
- Frontend port mismatch to keep straight: Docker **:5174** vs Vite dev **:5173** (see [[decisions]]).

## Watch-outs / recurring gotchas
- Keep `APP_DEV_LOGIN_ENABLED` / `VITE_DEV_LOGIN` = `false` outside local dev.
- Never commit `.env` (real Azure/OpenAI/JWT values live there only); `.env.example` is placeholders.
- Preserve the AI mock-fallback contract and the one-directional layering on every change.
- Keep `data.sql` idempotent.

## Suggested next steps
1. Add the first backend test slice (scoring math + `MockAiEvaluator` + a security/role test).
2. Add a minimal CI (build + `mvn test` + `npm run build`).
3. Reconcile the 5173/5174 port story across README, `.env.example`, and compose.
