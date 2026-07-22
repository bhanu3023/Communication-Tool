# Workflow: Testing

How to add and run tests for the AI Comm Trainer. Code-level tests here; **live-browser QA is gstack
`/qa`**.

> Context: no `backend/src/test` exists yet — the first tests set the convention. Test deps are
> already in `pom.xml`. Full standard: `.claude/rules/testing-standard.md`; patterns:
> `testing-patterns` skill.

## 1. Decide the level
- **Behavioral / UI flow** (sign-in, take an assessment, manager dashboard) → gstack **`/qa <url>`**.
- **Logic / contract** → code-level tests via the **`test-writer`** agent.

## 2. Author code-level tests (priority order)
1. **Scoring math** — Listening (10/correct, cap 100), Speaking weighted rubric (30/25/20/10/10/5,
   section = average), Writing (10-dim average), overall = mean, weak area = lowest, pass mark 75.
2. **AI mock-fallback contract** — `MockAiEvaluator` stable output; `OpenAiClient` throws → service
   returns mock, error never propagates.
3. **Attempt policy** — `AttemptPolicy`/`AttemptService`, manager `grant-attempt`.
4. **Security/roles** (`spring-security-test`) — 401 unauthenticated; 403 employee → `/api/manager/**`;
   no cross-user data access.

## 3. Rules for every test
- Deterministic: no live OpenAI/Azure, no real wall-clock (inject/fake timers).
- Mirror the main package under `backend/src/test/java/com/cloudfuze/trainer/...`.
- Respect (or explicitly seed) `data.sql` assumptions.

## 4. Run
```bash
cd backend && mvn test
# frontend (if/when Vitest is added): cd frontend && npm test
```

## 5. Before PR
- `/qa <staging-url>` for the affected flow (gstack).
- Confirm new tests pass in `/review` context; note coverage in the PR (`.claude/rules/pr-standard.md`).

## 6. Frontend tests (when introduced)
Propose **Vitest + React Testing Library** (Vite-native); test `services/*` (mock axios), timer/
recorder hooks, and `ProtectedRoute`. Get an architect nod before adding test infra.
