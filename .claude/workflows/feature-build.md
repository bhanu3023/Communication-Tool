# Workflow: Feature Build

End-to-end workflow for building a new feature in the AI Comm Trainer, using gstack skills for the
generic phases and this repo's rules/agents for the project-specific ones.

> Run the **Pre-flight gstack check** (`CLAUDE.md`) first. If gstack is missing, show Menu B and
> offer to install it.

1. **`/office-hours`** — clarify the problem, users, and success criteria (gstack).
2. **`/autoplan`** — CEO + eng + design review of the approach (gstack). For architecture-heavy work
   add `/plan-eng-review`; have the **`architect`** agent confirm placement against
   `.claude/rules/architecture-boundaries.md`.
3. **Locate touch-points** — use the **`researcher`** agent + `.claude/memory/repository-map.md`
   instead of scanning the repo.
4. **Implement** following `.claude/rules/architecture-boundaries.md`, `code-style.md`,
   `api-conventions.md`:
   - Backend: thin controller `/api/<module>` → service → repository/entity; DTO records in
     `<Module>Dtos`; AI via `AiService` (keep the mock fallback); role scoping via `currentUser.user()`.
   - Frontend: page + `services/` wrapper (never raw axios) + `ProtectedRoute`; MUI/`theme.js`;
     `AuthContext`/`ToastContext`.
   - Use `/scaffold` to generate consistent boilerplate.
5. **Tests** — **`test-writer`** adds deterministic tests (`.claude/rules/testing-standard.md`).
6. **`/review`** — gstack code review, then **`/team-review`** for project conventions.
7. **`/qa <staging-url>`** — real browser test of the new flow (gstack).
8. **`/cso`** — security audit **only if** the change is security-sensitive (auth/roles/secrets/AI
   key/`data.sql`); pair with the **`security-reviewer`** agent.
9. **`/ship`** — open the PR per `.claude/rules/pr-standard.md`.
10. **Docs** — update `docs/ARCHITECTURE.md` / `.claude/memory/*` / Swagger annotations in the same PR.

**Constraint gate (never weaken):** Microsoft-only login · dev-login flags `false` · stateless API ·
AI mock-fallback intact · role isolation · idempotent `data.sql`.
