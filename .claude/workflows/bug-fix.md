# Workflow: Bug Fix

Investigate → root-cause → fix minimally → verify, using gstack + this repo's map/agents.

> Pre-flight gstack check first (`CLAUDE.md`).

1. **Reproduce** — capture exact steps, the failing flow, and any `ErrorResponse`/console output.
2. **`/investigate`** — gstack root-cause pass, and/or the **`researcher`** agent starting from
   `.claude/memory/repository-map.md` to find the owning module. Read the narrowest relevant files.
3. **Name the root cause** before editing. Common areas:
   | Symptom | Look here |
   |---|---|
   | 401 / login loop | `services/api.js` (401 handler), `JwtAuthenticationFilter`, `AzureTokenVerifier`, `SecurityConfig`, `authConfig.js` |
   | 403 / data leak | `/api/manager/**` rules, `@PreAuthorize`, `currentUser.user()` scoping |
   | Wrong score / AI error surfaced | section `*Service` + `service.ai` (OpenAI vs `MockAiEvaluator` path — fallback must catch) |
   | Timer / exam-mode | `useCountdown`, `AssessmentTimers`, `useExamMode`, `useEscapeToEnd` |
   | Seed / startup / schema | `data.sql` idempotency, `application.yml` (`ddl-auto`, defer-init) |
4. **Fix minimally**, matching `.claude/rules/*`; do not weaken a Critical Constraint to patch a bug.
5. **Add a regression test** (`.claude/rules/testing-standard.md` / `testing-patterns` skill).
6. **`/review`** → **`/team-review`**.
7. **`/qa <staging-url>`** — verify the fixed flow in a real browser.
8. **`/cso`** — if the bug/fix is auth/role/secret-related; pair with **`security-reviewer`**.
9. **`/ship`** — PR per `.claude/rules/pr-standard.md`; note root cause + the regression test in the
   description.
10. **Record** any non-obvious cause/decision in `.claude/memory/decisions.md` or `progress.md`.
