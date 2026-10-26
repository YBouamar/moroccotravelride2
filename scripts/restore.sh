#!/usr/bin/env bash
# Restores a backup made by backup.sh, on a BLANK environment first (restore test, RUNBOOK):
#   ./scripts/restore.sh 20261101T021500Z
# Needs the age PRIVATE key (kept off the production server), rclone access to the remote,
# and the target database URL and Storage directory. Never run it on production by accident:
# it asks for confirmation and refuses a non-empty database unless FORCE=1.
set -euo pipefail

STAMP="${1:?usage: restore.sh <backup timestamp>}"
: "${TARGET_DATABASE_URL:?missing}" "${TARGET_STORAGE_DIR:?missing}" "${AGE_IDENTITY:?missing (private key file)}" "${RCLONE_REMOTE:?missing}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

TABLES="$(psql "$TARGET_DATABASE_URL" -tAc "select count(*) from public.companies" 2>/dev/null || echo 0)"
if [ "${TABLES:-0}" != "0" ] && [ "${FORCE:-0}" != "1" ]; then
  echo "The target database already holds companies. Use a blank environment or FORCE=1." >&2
  exit 1
fi
read -r -p "Restore backup $STAMP into $TARGET_DATABASE_URL ? Type RESTORE to continue: " answer
[ "$answer" = "RESTORE" ] || { echo "Cancelled."; exit 1; }

rclone copy "$RCLONE_REMOTE/$STAMP" "$WORK" --quiet
(cd "$WORK" && sha256sum --check SHA256SUMS)

age --decrypt --identity "$AGE_IDENTITY" --output "$WORK/db.dump" "$WORK/db.dump.age"
age --decrypt --identity "$AGE_IDENTITY" --output "$WORK/storage.tar.gz" "$WORK/storage.tar.gz.age"

pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$TARGET_DATABASE_URL" "$WORK/db.dump"
mkdir -p "$TARGET_STORAGE_DIR"
tar -C "$TARGET_STORAGE_DIR" -xzf "$WORK/storage.tar.gz"

echo "Restored $STAMP. Check: sign in, open an invoice PDF and a company document, then note the test date in RUNBOOK.md."
