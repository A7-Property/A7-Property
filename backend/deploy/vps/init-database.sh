#!/bin/sh
set -eu
: "${POSTGRES_APP_PASSWORD:?Set separate application database password}"
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<'SQL'
\getenv app_password POSTGRES_APP_PASSWORD
SELECT format('CREATE ROLE a7 LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L', :'app_password') \gexec
ALTER DATABASE a7_property OWNER TO a7;
ALTER SCHEMA public OWNER TO a7;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SQL
