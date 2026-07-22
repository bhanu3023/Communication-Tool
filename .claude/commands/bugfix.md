---
description: Investigate and fix a bug in the AI Comm Trainer with the gstack + project workflow
argument-hint: <bug description or error message>
---

# /bugfix — investigate, fix, verify

Bug: `$ARGUMENTS`

Follow `.claude/workflows/bug-fix.md`. In short:

1. **Pre-flight gstack check** (`CLAUDE.md`).
2. **Reproduce & investigate:** run gstack `/investigate` (or the `researcher` agent). Start from
   `.claude/memory/repository-map.md` to find the owning module; read the narrowest relevant files.
3. **Root-cause first.** State the cause and the minimal fix before editing. Common areas:
   - Auth/401: `JwtAuthenticationFilter`, `AzureTokenVerifier`, `SecurityConfig`, `services/api.js`.
   - Scoring wrong: the section `*Service` + `service.ai` (check mock vs OpenAI path).
   - Role leak/403: `/api/manager/**` rules, `currentUser.user()` scoping.
   - Assessment UX/timers: `useCountdown`, `AssessmentTimers`, `useExamMode`.
   - Seed/data issues: `data.sql` idempotency, Hibernate `ddl-auto`.
4. **Fix minimally**, matching `.claude/rules/*`. Don't weaken Critical Constraints.
5. **Add a regression test** (`.claude/rules/testing-standard.md`).
6. **Review & verify:** `/review` → `/team-review` → `/qa <url>` on the affected flow.
7. **Security (if auth/role/secret related):** `/cso`.
8. **Ship:** `/ship`.
