# Project Context

## What this is
**AI Communication Skills Trainer** — an internal CloudFuze web application that helps **managers
evaluate and improve their employees' communication skills** through AI-scored assessments in three
areas: **Listening**, **Speaking**, and **Writing**.

## Who uses it (roles)
- **Employee** — takes timed, proctored assessments; sees their own dashboard, history, scores, and
  AI feedback.
- **Manager** — sees a table of their **direct reports**, drills into a per-employee detail page with
  full score breakdowns, and downloads a PDF report.

## Core value / behavior
- Sign-in is **Microsoft (Azure AD) only**. On first login the backend provisions the user (name,
  email, employee id, department, team, role, manager).
- Each assessment section is scored: Listening objectively (MCQ), Speaking and Writing via **OpenAI**
  when a key is configured, otherwise a **deterministic mock evaluator** so the whole app works
  offline. Overall score = mean of the three sections; weak area = lowest section; pass mark = 75.
- Assessments are timed (overall + per-question) and lightly proctored (fullscreen / exam-mode /
  proctor events).

## Scope & status (as of 2026-07)
This is the **runnable foundation**: full structure, all three modules wired end-to-end, Docker
Compose, seed data, and Swagger. AI prompt tuning and some edge behaviors use solid defaults intended
to be refined iteratively. **No automated tests exist yet** (see `.claude/memory/progress.md`).

## Ownership
- Company: **CloudFuze**. Java package base: `com.cloudfuze.trainer`. Maven artifact
  `com.cloudfuze:ai-comm-trainer:1.0.0`.
- Azure app registration: **SAT-communication-trainer** (SPA, auth-code + PKCE; backend only
  *validates* the ID token, no client secret).

## Related knowledge
See [[architecture]], [[domain-knowledge]], [[repository-map]], [[decisions]], [[progress]].
