# Testing Standard

> **Current state (assumption to verify):** there is **no `backend/src/test`** directory and no
> frontend test setup yet. Test dependencies *are* present in `backend/pom.xml`
> (`spring-boot-starter-test`, `spring-security-test`). This rule defines the standard for the
> tests we add, and how gstack `/qa` complements them.

## Division of labor

- **gstack `/qa <url>`** = real-browser, end-to-end QA against a running app (sign-in flow, taking
  an assessment, manager dashboard). Use it before every PR that touches UI or flows.
- **Code-level tests (this file)** = fast, deterministic checks the `test-writer` agent authors.

## Backend (JUnit 5 + Spring Boot Test)

- Location: `backend/src/test/java/com/cloudfuze/trainer/...`, mirroring the main package.
- Naming: `<ClassUnderTest>Test` for unit tests, `<Area>IT`/`<Controller>Test` with
  `@SpringBootTest`/`@WebMvcTest` for slices.
- **Prioritize the deterministic core first** (no network, no OpenAI):
  - Scoring math: Listening MCQ (10/correct, max 100), Speaking weighted rubric
    (pron 30 / acc 25 / flu 20 / gram 10 / vocab 10 / conf 5), Writing 10-dimension average,
    overall = mean of sections, weak area = lowest section. See `.claude/memory/domain-knowledge.md`.
  - `MockAiEvaluator` output shape and stability (it must stay deterministic).
  - `AttemptPolicy` / attempt limits, section pass mark (75) and pass/fail status.
- **AI tests must not hit OpenAI.** Test the `MockAiEvaluator` path, or mock `OpenAiClient`. Assert
  the **fallback contract**: any OpenAI error → mock result, app never throws to the user.
- **Security tests** use `spring-security-test`: unauthenticated → 401; employee hitting
  `/api/manager/**` → 403; employee cannot read another user's data.
- Run: `cd backend && mvn test`.

## Frontend

- If/when added, use **Vitest + React Testing Library** (fits Vite). Put tests next to the unit as
  `X.test.jsx`.
- Focus on: `services/` API wrappers (mock axios), timer/recorder hooks (`useCountdown`,
  `useAudioRecorder`), and `ProtectedRoute` role guarding.

## What every test must respect

- Deterministic: never depend on live OpenAI/Azure or wall-clock timing (inject/fake timers).
- Don't require real Azure sign-in — exercise the app-JWT layer directly or the dev-login path.
- Keep the seed-data assumptions (`data.sql`) in sync if a test relies on seeded users/content.
