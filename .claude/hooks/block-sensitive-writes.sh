#!/usr/bin/env bash
# PreToolUse hook (matcher: Write|Edit) for the AI Comm Trainer.
# Blocks writes/edits to secret and sensitive files as a backstop to .gitignore.
# Protocol: reads the tool-call JSON on stdin; exit 2 = block (message on stderr).
set -euo pipefail

payload="$(cat)"

# Extract the target path from the tool input JSON (no jq dependency).
file_path="$(printf '%s' "$payload" \
  | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -n1 | sed -E 's/.*:[[:space:]]*"([^"]*)"/\1/')"

[ -z "${file_path:-}" ] && exit 0

# Normalize slashes for matching.
norm="${file_path//\\//}"

case "$norm" in
  *.env|*/.env|*.env.*|*/.env.local|*.pem|*.key|*/id_rsa*|*/secrets/*)
    # Allow the safe example templates.
    case "$norm" in
      *.env.example) exit 0 ;;
    esac
    echo "BLOCKED: refusing to write '$file_path' — secrets belong only in .env (gitignored)." >&2
    echo "See .claude/rules/security-rules.md. Update .env.example with a placeholder instead." >&2
    exit 2
    ;;
esac

exit 0
