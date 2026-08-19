#!/usr/bin/env bash
# Runs ON the production server (via ssh), as part of .github/workflows/deploy.yml.
# This file is shipped inside the git-archive release itself, so it's always present
# at $DEPLOY_PATH after the overlay extract below — no separate scp needed for it.
#
# Contract: always prints a final line "DEPLOY_RESULT=success" or
# "DEPLOY_RESULT=failed:<stage>" so the calling workflow can parse the outcome.
# Never uses `set -e` — every failure path is handled explicitly so we can roll back
# and still emit the result marker instead of dying silently mid-script.
set -uo pipefail

DEPLOY_PATH="$1"
RELEASE_TAR="$2"
HEALTH_URL="$3"

BACKEND_IMG="communication-tool-backend"
FRONTEND_IMG="communication-tool-frontend"
BACKUP_DIR="$HOME/backups/comm-tool"
MIN_BACKUP_BYTES=1024
HEALTH_RETRIES=10
HEALTH_DELAY_SECS=6

fail() {
  echo "DEPLOY_RESULT=failed:$1"
  exit 1
}

rollback_images() {
  echo "== Rolling back to previous images =="
  docker tag "${BACKEND_IMG}:previous" "${BACKEND_IMG}:latest" 2>/dev/null || echo "  no ${BACKEND_IMG}:previous to restore"
  docker tag "${FRONTEND_IMG}:previous" "${FRONTEND_IMG}:latest" 2>/dev/null || echo "  no ${FRONTEND_IMG}:previous to restore"
  if docker compose -f "$DEPLOY_PATH/docker-compose.yml" up -d --no-build; then
    echo "  rollback complete — previous version restored and running"
  else
    echo "  ROLLBACK ITSELF FAILED — a human must intervene on the server directly, containers may be down"
  fi
}

cd "$DEPLOY_PATH" || fail "setup"

echo "== Overlaying new release onto $DEPLOY_PATH =="
echo "   (tar extraction only adds/updates tracked files — .env, deploy keys, uploads,"
echo "    and anything else not in the git archive are left untouched, never wiped)"
tar -xf "$RELEASE_TAR" -C "$DEPLOY_PATH" || fail "extract"
rm -f "$RELEASE_TAR"

echo "== Backing up database before touching anything =="
mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/trainer-${TS}.sql.gz"
if ! docker exec trainer-db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$BACKUP_FILE"; then
  rm -f "$BACKUP_FILE"
  fail "backup"
fi
BACKUP_BYTES=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || echo 0)
if [ "$BACKUP_BYTES" -lt "$MIN_BACKUP_BYTES" ]; then
  echo "Backup looks empty/broken (${BACKUP_BYTES} bytes, expected >= ${MIN_BACKUP_BYTES}) — refusing to deploy."
  rm -f "$BACKUP_FILE"
  fail "backup"
fi
echo "Backup OK: $BACKUP_FILE (${BACKUP_BYTES} bytes)"
# Keep the last 5 backups only.
ls -1t "$BACKUP_DIR"/trainer-*.sql.gz 2>/dev/null | tail -n +6 | xargs -r rm -f

echo "== Tagging currently-running images as :previous (rollback safety net) =="
docker tag "${BACKEND_IMG}:latest" "${BACKEND_IMG}:previous" 2>/dev/null || echo "  no existing ${BACKEND_IMG}:latest (first-ever deploy)"
docker tag "${FRONTEND_IMG}:latest" "${FRONTEND_IMG}:previous" 2>/dev/null || echo "  no existing ${FRONTEND_IMG}:latest (first-ever deploy)"

echo "== Building new images (running containers are NOT touched yet) =="
if ! docker compose build; then
  echo "Build failed. Nothing on the server has been touched — old containers are still running as before."
  fail "build"
fi

echo "== Swapping to the new version =="
if ! docker compose up -d; then
  echo "Swap itself failed to start — rolling back immediately."
  rollback_images
  fail "build"
fi

echo "== Health-checking $HEALTH_URL from the server itself =="
healthy=0
for i in $(seq 1 "$HEALTH_RETRIES"); do
  if curl -kfsS --max-time 10 "$HEALTH_URL" -o /dev/null; then
    healthy=1
    break
  fi
  echo "  attempt $i/$HEALTH_RETRIES not healthy yet, retrying in ${HEALTH_DELAY_SECS}s..."
  sleep "$HEALTH_DELAY_SECS"
done

if [ "$healthy" -ne 1 ]; then
  echo "Health check failed after $HEALTH_RETRIES attempts."
  rollback_images
  fail "health_check"
fi

echo "Deploy successful and healthy."
echo "NOTE: this script cannot undo a database migration that partially applied before a"
echo "later step failed — that requires a human to check DB state manually if it ever happens."
echo "DEPLOY_RESULT=success"
