---
name: testing-patterns
description: How to write tests for THIS codebase — the deterministic scoring core, the AI mock-fallback contract, and Spring Security role tests for the AI Comm Trainer. Use when adding or fixing tests; gstack /qa covers live-browser QA.
---

# Testing patterns — AI Comm Trainer

> gstack `/qa <url>` does real-browser end-to-end QA. This skill is for **code-level tests** unique
> to this project. Full standard: `.claude/rules/testing-standard.md`. Note: no test dir exists yet —
> the first tests you write set the pattern.

## The high-value, deterministic targets (test these first)

**Scoring math** (pure logic, no network — see `.claude/memory/domain-knowledge.md`):
- Listening: 10 marks/correct, capped at 100.
- Speaking weighted rubric: pronunciation 30 / accuracy 25 / fluency 20 / grammar 10 /
  vocabulary 10 / confidence 5; section = average of sentence scores.
- Writing: average of the 10 dimensions.
- Overall = mean of the three sections; weak area = lowest section; pass mark = **75** per section.

**AI fallback contract** (the most important behavioral test):
- Test the `MockAiEvaluator` path directly and assert stable, structured output.
- Mock `OpenAiClient` to throw → assert the service returns the mock result and **never propagates
  the error to the caller**. This contract must never regress.

**Attempt policy**: `AttemptPolicy` / `AttemptService` limits and manager `grant-attempt`.

## Backend test setup

- Location mirrors main: `backend/src/test/java/com/cloudfuze/trainer/...`.
- Deps already in `pom.xml`: `spring-boot-starter-test`, `spring-security-test`.
- Unit tests: plain JUnit 5 on services (inject mocks). Slice tests: `@WebMvcTest` for controllers.
- **Security tests** with `spring-security-test`: no token → 401; employee → `/api/manager/**` → 403;
  employee cannot read another user's data (role isolation).
- Never hit live OpenAI/Azure. Never depend on wall-clock — inject/fake time for timer logic.
- Run: `cd backend && mvn test`.

## Frontend tests (when added)

- Prefer **Vitest + React Testing Library** (Vite-native). Test `services/*` (mock axios),
  `useCountdown`/`useAudioRecorder` hooks, and `ProtectedRoute` role guarding. Files: `X.test.jsx`.

## Checklist for any new test
- [ ] Deterministic (no live AI/Azure, no real clock). - [ ] Respects seeded `data.sql` assumptions.
- [ ] Covers the mock-fallback path for AI-touching code. - [ ] Asserts role scoping for new endpoints.
