#!/bin/sh
# Dumps the database to a timestamped, gzip-compressed file and deletes
# backups older than RETENTION_DAYS. Runs inside the "backup" container
# defined in docker-compose.prod.yml, on a loop (see entrypoint.sh).

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUT_DIR="/backups"
OUT_FILE="${OUT_DIR}/mavix_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

mkdir -p "$OUT_DIR"

echo "[backup] $(date -Iseconds) starting dump -> ${OUT_FILE}"
pg_dump "$DATABASE_URL" | gzip > "$OUT_FILE"
echo "[backup] $(date -Iseconds) done ($(du -h "$OUT_FILE" | cut -f1))"

echo "[backup] pruning backups older than ${RETENTION_DAYS} days"
find "$OUT_DIR" -name 'mavix_*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete

echo "[backup] current backups:"
ls -lh "$OUT_DIR"
