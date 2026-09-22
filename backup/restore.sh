#!/bin/sh
# Restores a database from a backup created by backup.sh.
#
# USAGE (run from the host, with the stack running):
#   docker compose -f docker-compose.prod.yml cp backup/restore.sh backup:/tmp/restore.sh
#   docker compose -f docker-compose.prod.yml exec backup sh /tmp/restore.sh /backups/mavix_20260101_020000.sql.gz
#
# WARNING: this overwrites the current database contents. Take a fresh
# backup first if you're not sure, and never run this against production
# without confirming you have the right file.

set -e

if [ -z "$1" ]; then
  echo "Usage: restore.sh <path-to-backup.sql.gz>"
  exit 1
fi

echo "Restoring from $1 into \$DATABASE_URL ..."
gunzip -c "$1" | psql "$DATABASE_URL"
echo "Restore complete."
