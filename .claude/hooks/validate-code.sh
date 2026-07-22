#!/usr/bin/env bash
# PostToolUse hook (matcher: Write|Edit) for the AI Comm Trainer.
# Lightweight, fast sanity checks on the edited file. Non-fatal (exit 0);
# surfaces warnings on stderr so Claude sees them without blocking the edit.
set -uo pipefail

payload="$(cat)"
file_path="$(printf '%s' "$payload" \
  | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -n1 | sed -E 's/.*:[[:space:]]*"([^"]*)"/\1/')"

[ -z "${file_path:-}" ] && exit 0
[ -f "$file_path" ] || exit 0

warn() { echo "validate-code: $1" >&2; }

# 1) Never let real-looking secrets land in tracked files.
case "$file_path" in
  *.env.example|*/.claude/*) : ;;  # examples/templates are exempt
  *)
    if grep -qiE 'sk-[A-Za-z0-9_-]{16,}|AZURE_CLIENT_SECRET=.+[A-Za-z0-9]|-----BEGIN (RSA |EC )?PRIVATE KEY-----' "$file_path" 2>/dev/null; then
      warn "possible secret detected in $file_path — see .claude/rules/security-rules.md"
    fi
    ;;
esac

# 2) Project-convention smell checks (advisory only).
case "$file_path" in
  *backend/src/main/java/*/controller/*Controller.java)
    grep -qE '\.(findById|findAll|save|deleteById)\(|Repository ' "$file_path" 2>/dev/null \
      && warn "$file_path: controller looks like it touches a repository — controllers must delegate to a service (architecture-boundaries.md)"
    grep -q '@Autowired' "$file_path" 2>/dev/null \
      && warn "$file_path: use constructor injection, not @Autowired fields (code-style.md)"
    ;;
  *frontend/src/components/*.jsx|*frontend/src/pages/*.jsx)
    grep -qE "from 'axios'|fetch\(" "$file_path" 2>/dev/null \
      && warn "$file_path: route HTTP through services/api.js, not raw axios/fetch (architecture-boundaries.md)"
    ;;
esac

exit 0
