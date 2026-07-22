# AGENTS.md — Project agents & how they hand off

This project defines a small set of **project-specific** subagents in `.claude/agents/`.
They exist to carry *this codebase's* conventions and domain rules — **not** to reimplement
generic engineering workflows. Generic review, QA, security auditing, and shipping are
handled by **gstack** skills (`/review`, `/qa`, `/cso`, `/ship`), which are installed
globally (see `CLAUDE.md` → Prerequisites).

> **Division of labor:** gstack skills know *how to review/QA/ship in general*. These agents
> know *how CloudFuze's AI Comm Trainer is built* — the layered Spring package boundaries,
> the DTO-record grouping, the Azure→app-JWT flow, the AI-fallback contract, and the
> employee/manager role isolation. When both could apply, run the gstack skill for the
> generic pass and use the matching agent for the project-specific pass.

## Agents

| Agent | Owns | gstack overlap / boundary |
|---|---|---|
| **architect** (`.claude/agents/architect.md`) | Layering (`controller→service→repository→entity`), package boundaries, new-module placement, cross-cutting decisions | Complements `/plan-eng-review`; the agent enforces *this repo's* boundaries defined in `.claude/rules/architecture-boundaries.md` |
| **code-reviewer** (`.claude/agents/code-reviewer.md`) | Project conventions: DTO-record grouping, constructor injection, `CurrentUser` usage, `ApiException`/`ErrorResponse` shape, React service/context patterns | **General review is `/review`.** This agent only checks project-specific conventions gstack doesn't know |
| **security-reviewer** (`.claude/agents/security-reviewer.md`) | Azure token validation, app-JWT handling, role isolation, secret hygiene, dev-login bypass state | **General security audit is `/cso`.** This agent focuses on *this app's* auth model in `.claude/rules/security-rules.md` |
| **test-writer** (`.claude/agents/test-writer.md`) | Authoring the *first* backend/frontend tests using this project's scaffolds (see `.claude/rules/testing-standard.md`) | Complements `/qa` (which does live-browser QA); this agent writes code-level tests |
| **researcher** (`.claude/agents/researcher.md`) | Answering "how/where is X implemented" by reading `.claude/memory/*` first, then source | Complements `/investigate`; use for read-only codebase questions |

## Handoff process

1. **Plan** — for anything non-trivial, start with `/office-hours` → `/autoplan` (gstack). The
   **architect** agent reviews placement against `.claude/rules/architecture-boundaries.md`.
2. **Implement** — follow `.claude/rules/*.md`. Use **researcher** to locate touch-points.
3. **Test** — **test-writer** adds/updates tests per `.claude/rules/testing-standard.md`.
4. **Review** — run gstack `/review` (generic) → **code-reviewer** agent (project conventions).
5. **Security** — for auth/role/secret/AI-key changes, run `/cso` → **security-reviewer** agent.
6. **Ship** — gstack `/ship` opens the PR against `.claude/rules/pr-standard.md`.

## Escalation rules

- **Architecture boundary would be crossed** (e.g. a controller calling a repository directly,
  a new top-level package): stop and escalate to **architect**; record the outcome in
  `.claude/memory/decisions.md`.
- **Auth / role-isolation / secret change**: mandatory **security-reviewer** + `/cso` before merge.
- **AI-fallback contract change** (OpenAI path no longer falls back to `MockAiEvaluator`):
  escalate to **architect** — this is a Critical Constraint.
- **DB schema change** (new/renamed entity, migration): architect + note in `decisions.md`;
  confirm `data.sql` stays idempotent.

## Ownership boundaries

- Agents produce recommendations and diffs; **humans/PR authors own merges**.
- No agent bypasses the gstack pre-PR gate (`/review` → `/qa` → `/cso` if sensitive → `/ship`).
- Agents must not weaken Critical Constraints in `CLAUDE.md` without an explicit decision entry.
