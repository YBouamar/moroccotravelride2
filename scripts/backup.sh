#!/usr/bin/env bash
# Daily backup of the self-hosted Supabase (SECURITY.md 2.8, ADR-013), run by cron on the VPS:
#   15 2 * * *  /opt/mtr/scripts/backup.sh >> /var/log/mtr-backup.log 2>&1
# 1. pg_dump of the database (custom format), 2. archive of the Storage files,
# 3. encryption with age (public key only on the server), 4. upload OUTSIDE the VPS with rclone,
# 5. 30 days of retention on the remote. Nothing readable stays on the server.
#
# Required environment (e.g. /opt/mtr/backup.env, chmod 600):
#   DATABASE_URL         postgres://... of the Supabase database (read-only role is enough)
#   STORAGE_DIR          path of the Supabase Storage volume (e.g. /opt/supabase/volumes/storage)
#   AGE_RECIPIENT        age public key (the private key stays OFF the server)
#   RCLONE_REMOTE        e.g. backup:mtr-backups (object storage outside Contabo)
set -euo pipefail

: "${DATABASE_URL:?missing}" "${STORAGE_DIR:?missing}" "${AGE_RECIPIENT:?missing}" "${RCLONE_REMOTE:?missing}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "[$STAMP] database dump"
pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" --file "$WORK/db.dump"

echo "[$STAMP] storage archive"
tar -C "$STORAGE_DIR" -czf "$WORK/storage.tar.gz" .

echo "[$STAMP] encryption"
for file in db.dump storage.tar.gz; do
  age --recipient "$AGE_RECIPIENT" --output "$WORK/$file.age" "$WORK/$file"
  rm -f "$WORK/$file"
done
sha256sum "$WORK"/*.age > "$WORK/SHA256SUMS"

echo "[$STAMP] upload"
rclone copy "$WORK" "$RCLONE_REMOTE/$STAMP" --quiet

echo "[$STAMP] retention ($RETENTION_DAYS days)"
rclone delete "$RCLONE_REMOTE" --min-age "${RETENTION_DAYS}d" --quiet
rclone rmdirs "$RCLONE_REMOTE" --leave-root --quiet

echo "[$STAMP] done"
