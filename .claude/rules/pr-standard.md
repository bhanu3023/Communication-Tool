# Pull Request Standard

How PRs are opened and what they must satisfy. gstack `/ship` opens the PR; this file is the bar it
must clear.

## Before opening a PR (the gate — never skip)

1. `/review` — gstack code review (bugs CI won't catch).
2. `/qa <staging-url>` — real-browser test of the affected flow (sign-in, an assessment, or the
   manager dashboard, as relevant).
3. `/cso` — security audit **if** the change touches auth, roles, secrets, the AI key path, or
   `data.sql`.
4. `/ship` — opens the PR.

## Branching & commits

- Never commit directly to `main`. Branch: `feature/<slug>`, `fix/<slug>`, or `chore/<slug>`.
- Small, focused commits; imperative subject lines. Keep unrelated changes out of the PR.
- Never commit `.env`, secrets, `backend/target/`, `frontend/node_modules/`, or `frontend/dist/`
  (all gitignored — keep it that way).

## PR description must include

- **What & why** — the change and the problem it solves.
- **Scope** — which module(s): auth / listening / speaking / writing / manager / proctor / infra.
- **Constraints check** — confirm none of the Critical Constraints (`CLAUDE.md`) are weakened:
  Microsoft-only login, dev-login flags remain `false`, stateless API, AI mock-fallback intact,
  role isolation preserved, `data.sql` still idempotent.
- **Testing** — what `mvn test` / frontend tests were added or run, and the `/qa` result.
- **Security** — for sensitive changes, the `/cso` outcome.
- **Screenshots / Swagger** — for UI or API changes.

## Review requirements

- Passes gstack `/review` and the project `code-reviewer` agent (conventions in `.claude/rules/`).
- No new secrets, no widened CORS, no bypassed role checks.
- DB/schema changes reviewed by the `architect` agent and recorded in
  `.claude/memory/decisions.md`.
- Docs updated when behavior changes (`README.md`, `docs/ARCHITECTURE.md`, or the relevant
  `.claude/memory/*.md`).
