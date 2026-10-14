#!/bin/sh
set -eu
umask 077
: "${A7_STACK_ENV_FILE:?Set absolute stack environment file}"
: "${A7_BACKUP_DIR:?Set absolute backup directory}"
case "$A7_BACKUP_DIR" in /*) ;; *) echo 'Backup directory must be absolute' >&2; exit 1;; esac
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
mkdir -p "$A7_BACKUP_DIR"
chmod 700 "$A7_BACKUP_DIR"
archive="$A7_BACKUP_DIR/a7-$(date -u +%Y%m%dT%H%M%SZ)-$$.dump"
trap 'rm -f "$archive.partial"' EXIT HUP INT TERM
docker compose --env-file "$A7_STACK_ENV_FILE" -f "$script_dir/compose.yml" exec -T postgres \
  pg_dump -U a7_admin -d a7_property --format=custom > "$archive.partial"
# Verify archive structure before publishing the local backup.
docker compose --env-file "$A7_STACK_ENV_FILE" -f "$script_dir/compose.yml" exec -T postgres \
  pg_restore --list < "$archive.partial" > /dev/null
mv "$archive.partial" "$archive"
printf '%s\n' "$archive"
