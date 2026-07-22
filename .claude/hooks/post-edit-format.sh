#!/usr/bin/env bash
# PostToolUse hook (matcher: Write|Edit) for the AI Comm Trainer.
# Best-effort formatting of the file that was just written/edited.
# Non-fatal: never blocks Claude — always exits 0. Skips silently if a formatter is absent.
set -uo pipefail

payload="$(cat)"
file_path="$(printf '%s' "$payload" \
  | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -n1 | sed -E 's/.*:[[:space:]]*"([^"]*)"/\1/')"

[ -z "${file_path:-}" ] && exit 0
[ -f "$file_path" ] || exit 0

case "$file_path" in
  *.jsx|*.js|*.ts|*.tsx|*.json|*.css|*.md)
    # Prettier is not a declared dependency here; run it only if the contributor has it.
    if command -v npx >/dev/null 2>&1 && [ -f frontend/node_modules/.bin/prettier ]; then
      (cd frontend && npx --no-install prettier --write "../$file_path" >/dev/null 2>&1) || true
    fi
    ;;
  *.java)
    # No formatter plugin is configured in pom.xml; nothing to run automatically.
    # Rely on IDE formatting + .claude/rules/code-style.md conventions.
    :
    ;;
esac

exit 0
