#!/bin/sh
set -eu
: "${A7_STACK_ENV_FILE:?Set absolute stack environment file}"
[ "$#" -eq 1 ] && [ -s "$1" ] || { echo 'Usage: restore-test.sh backup.dump' >&2; exit 1; }
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
test_db="a7_restore_test_$(date -u +%Y%m%d%H%M%S)_$$"
compose() { docker compose --env-file "$A7_STACK_ENV_FILE" -f "$script_dir/compose.yml" "$@"; }
cleanup() { compose exec -T postgres dropdb -U a7_admin --if-exists "$test_db"; }
trap cleanup EXIT HUP INT TERM
compose exec -T postgres createdb -U a7_admin "$test_db"
compose exec -T postgres pg_restore -U a7_admin -d "$test_db" --exit-on-error --no-owner < "$1"
compose exec -T postgres psql -U a7_admin -d "$test_db" -v ON_ERROR_STOP=1 -c 'SELECT count(*) AS migrations FROM "_prisma_migrations";'
echo 'Backup restored successfully into an isolated temporary database.'
