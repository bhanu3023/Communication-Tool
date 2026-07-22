---
description: Drive a new feature end-to-end for the AI Comm Trainer using the gstack + project workflow
argument-hint: <short feature description>
---

# /feature — build a feature the CloudFuze way

Feature: `$ARGUMENTS`

Follow `.claude/workflows/feature-build.md`. In short:

1. **Run the Pre-flight gstack check** (`CLAUDE.md`). If gstack is missing, show Menu B.
2. **Clarify & plan (gstack):** `/office-hours` → `/autoplan` (CEO + eng + design review).
3. **Locate touch-points:** use the `researcher` agent / `.claude/memory/repository-map.md` — don't
   scan the whole repo.
4. **Implement** following `.claude/rules/architecture-boundaries.md`, `code-style.md`,
   `api-conventions.md`. Keep the layered boundaries and the AI mock-fallback contract.
5. **Tests:** `test-writer` adds deterministic tests (`.claude/rules/testing-standard.md`).
6. **Review:** gstack `/review` → project `/team-review`.
7. **QA:** `/qa <staging-url>` for the affected flow.
8. **Security (if sensitive):** `/cso` + `security-reviewer` agent (auth/roles/secrets/AI key).
9. **Ship:** `/ship` — opens the PR per `.claude/rules/pr-standard.md`.

Confirm the plan with me before writing code. Note any Critical-Constraint impact up front.
