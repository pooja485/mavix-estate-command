#!/bin/sh
# Runs backup.sh once immediately, then every BACKUP_INTERVAL_HOURS (default 24h).
# Simpler and more transparent in container logs than a real cron daemon.

set -e
INTERVAL_HOURS="${BACKUP_INTERVAL_HOURS:-24}"
INTERVAL_SECONDS=$((INTERVAL_HOURS * 3600))

while true; do
  sh /scripts/backup.sh || echo "[backup] FAILED at $(date -Iseconds) — will retry next cycle"
  echo "[backup] sleeping ${INTERVAL_HOURS}h until next run"
  sleep "$INTERVAL_SECONDS"
done
