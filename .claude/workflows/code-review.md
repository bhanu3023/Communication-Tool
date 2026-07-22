# Workflow: Code Review

Two-pass review: gstack for generic quality, project artifacts for CloudFuze-specific conventions.

> Pre-flight gstack check first (`CLAUDE.md`).

1. **Scope the diff** — `git diff` the branch; identify the modules touched (auth / listening /
   speaking / writing / manager / proctor / infra).
2. **Pass 1 — generic (gstack `/review`)** — bugs, correctness, quality, things CI won't catch.
3. **Pass 2 — project conventions** — run **`/team-review`** and/or the **`code-reviewer`** agent
   against:
   - `.claude/rules/architecture-boundaries.md` — layering; AI mock-fallback; no OpenAI types leaking.
   - `.claude/rules/api-conventions.md` — `/api/<module>` routing, DTO records, `ErrorResponse` envelope.
   - `.claude/rules/code-style.md` — constructor injection, `<Module>Dtos`, React `services/`/contexts.
   - `.claude/rules/security-rules.md` — role isolation, secrets, dev-login flags (→ **`security-reviewer`**
     + `/cso` if auth/role/secret/AI-key/`data.sql` touched).
4. **Structural concerns** → escalate to the **`architect`** agent; log accepted changes in
   `.claude/memory/decisions.md`.
5. **Tests & docs** — confirm deterministic tests updated and docs/Swagger/memory in sync.
6. **Verdict** — findings as `file:line` grouped **blocking / should-fix / nit**, ending with
   **ready to `/ship`** or **needs changes**.

**Reviewer reminder:** these agents/commands cover what gstack *doesn't* know about this repo — don't
re-litigate generic findings already surfaced by `/review`.
