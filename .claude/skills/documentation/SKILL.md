---
name: documentation
description: Where and how to document changes in the AI Comm Trainer — which of README, docs/ARCHITECTURE.md, Swagger annotations, and .claude/memory/* to update. Use when a change alters behavior, architecture, or setup. gstack /document-generate handles bulk doc generation.
---

# Documentation — AI Comm Trainer

> gstack `/document-release` / `/document-generate` do generic release/doc generation. This skill
> tells Claude **which doc surface in THIS repo to keep in sync** so knowledge stays discoverable and
> future sessions read docs before scanning code.

## The doc surfaces and when to touch each

| Change | Update |
|---|---|
| New/changed endpoint | `@Operation`/`@Tag` on the controller (feeds Swagger) + a `services/` wrapper |
| Setup / env var / run steps | `README.md` + `.env.example` (placeholders only) |
| Architecture, layering, auth flow, scoring | `docs/ARCHITECTURE.md` **and** `.claude/memory/architecture.md` |
| A decision or trade-off (schema, dependency, boundary) | `.claude/memory/decisions.md` |
| Business/domain concept (rubrics, roles, attempt policy) | `.claude/memory/domain-knowledge.md` |
| New files/modules / entry points moved | `.claude/memory/repository-map.md` |
| Status, known limitation, TODO | `.claude/memory/progress.md` |

## Rules for docs in this repo

- **`.claude/memory/*` is the source of truth for project knowledge** — keep it current so future
  Claude sessions read it first and avoid full-repo scans.
- Keep `CLAUDE.md` lean (< 300 lines) — link to memory files rather than inlining detail.
- **Never put secrets in any doc.** `.env.example` holds placeholders only; real values live in
  `.env` (gitignored).
- Convert relative dates to absolute in memory files.
- When behavior changes, update docs in the **same PR** (`.claude/rules/pr-standard.md` requires it).

## Style
Terse, factual, skimmable; tables over prose for mappings; use `file:line`-style references so
readers can jump to source.
