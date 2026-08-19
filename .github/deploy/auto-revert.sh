#!/usr/bin/env bash
# Runs on the GitHub Actions runner (NOT the server) after a deploy failure.
# Builds a single revert commit covering the whole pushed range and pushes it to main,
# which re-triggers this same workflow and deploys the known-good code automatically.
#
# Verified by hand against a disposable throwaway repo before this was ever wired into
# the workflow — see the conversation history for the exact test transcripts (multi-commit
# range revert, tip-only fallback, and the loop guard all produced correct output).
#
# Deliberately does NOT use a heredoc for the commit message: an unindented closing
# delimiter is a silent runtime bug, not a syntax error, and would only surface the one
# time this script actually needs to run. printf + a temp file + `git commit -F` avoids
# that class of bug entirely.
set -euo pipefail

: "${BEFORE:?}"; : "${SHA:?}"; : "${DEPLOY_RESULT:?}"; : "${RUN_URL:?}"

# DEPLOY_RESULT looks like "failed:build" / "failed:backup" / "failed:health_check" / etc,
# set by .github/deploy/deploy-remote.sh. Strip the prefix to get the real stage name.
STAGE="${DEPLOY_RESULT#failed:}"
case "$STAGE" in
  build)        REASON_TEXT="the BUILD step failed" ;;
  health_check) REASON_TEXT="the post-deploy HEALTH CHECK failed (server auto-rolled back to the previous version already)" ;;
  backup)       REASON_TEXT="the pre-deploy DATABASE BACKUP failed or looked empty/broken — nothing was deployed" ;;
  extract)      REASON_TEXT="extracting the release onto the server FAILED — nothing was deployed" ;;
  setup)        REASON_TEXT="the deploy script could not even start (bad deploy path?) — nothing was deployed" ;;
  *)            REASON_TEXT="deploy failed at stage '$STAGE'" ;;
esac

ZERO_SHA="0000000000000000000000000000000000000000"

# --- Loop guard: never auto-revert a commit that is itself an auto-revert. ---
# If the revert commit itself fails to deploy, that's a real infra problem (server down,
# etc.) that flip-flopping reverts would never fix — fail loudly instead.
if git log -1 --format=%B "$SHA" | grep -q '\[auto-revert\]'; then
  echo "GUARD: tip commit $SHA is itself an auto-revert. Refusing to auto-revert again." >&2
  echo "This means the revert itself failed to deploy — a human must investigate the server/infra directly." >&2
  exit 1
fi

# --- Determine the revert range; fall back to tip-only if BEFORE is unusable. ---
if [ "$BEFORE" = "$ZERO_SHA" ] || ! git cat-file -e "${BEFORE}^{commit}" 2>/dev/null; then
  echo "NOTE: github.event.before is not usable (new branch / manual trigger / force-push)." >&2
  echo "Falling back to reverting only the tip commit." >&2
  RANGE_START=$(git rev-parse "${SHA}~1")
else
  RANGE_START=$(git rev-parse "$BEFORE")
fi

COMMIT_LIST=$(git log --oneline --reverse "${RANGE_START}..${SHA}")
if [ -z "$COMMIT_LIST" ]; then
  echo "GUARD: no commits found in range ${RANGE_START}..${SHA}. Nothing to revert." >&2
  exit 1
fi

# --- Perform the revert as ONE commit covering the whole range. ---
if ! git revert --no-commit "${RANGE_START}..${SHA}"; then
  echo "GUARD: revert produced conflicts that cannot be resolved automatically." >&2
  git revert --abort || true
  echo "A human must revert this range manually. See ${RUN_URL}" >&2
  exit 1
fi

MSG_FILE=$(mktemp)
{
  printf 'revert: auto-revert broken deploy (%s) [auto-revert]\n\n' "$STAGE"
  printf 'Automated revert triggered because %s.\n' "$REASON_TEXT"
  printf 'Failed run: %s\n\n' "$RUN_URL"
  printf 'Commits reverted (oldest first):\n'
  printf '%s\n' "$COMMIT_LIST" | sed 's/^/  - /'
  printf '\n'
  printf 'Production is now running the code from commit %s (the last known-good state before this push).\n\n' "$RANGE_START"
  printf 'RECOVERY:\n'
  printf '1. Check the failed run logs first to find out what actually broke: %s\n' "$RUN_URL"
  printf '2. Fix the problem in a new commit on top of this one, then push to main again as normal.\n'
  printf '3. If you need the reverted work back before a fix is ready:\n'
  printf '   WARNING: cherry-picking or reverting just the tip commit does NOT recover the earlier\n'
  printf '   commits in this batch (same range problem as this revert itself). Use the full range:\n'
  printf '     git cherry-pick %s..%s\n' "$RANGE_START" "$SHA"
  printf '   or, simpler, to just grab the whole snapshot in one step:\n'
  printf '     git checkout %s -- .\n' "$SHA"
  printf '4. NOTE: if a database migration partially applied before the failure, this revert does\n'
  printf '   NOT undo it. A human must check the DB state manually — code revert only fixes the\n'
  printf '   application, not data already written.\n'
} > "$MSG_FILE"

git commit -F "$MSG_FILE"
rm -f "$MSG_FILE"

echo "REVERT_SHA=$(git rev-parse HEAD)"
