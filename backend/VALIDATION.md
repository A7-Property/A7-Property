# Backend readiness validation

Validated on 2026-10-04 using Node 22.23.3 and a disposable PostgreSQL 16 container.

| Check | Result |
| --- | --- |
| Locked dependency installation (`npm ci`) | Passed; npm reported zero vulnerabilities |
| Prisma client generation | Passed |
| Strict TypeScript check | Passed |
| Unit tests | 7 suites, 42 tests passed |
| PostgreSQL 16 integration tests | 3 suites, 51 tests passed |
| All three migrations applied to an empty database | Passed |
| Schema versus migrations, separate PostgreSQL 16 shadow database | No difference |
| Production build | Passed; `dist/main.js` emitted |
| Runtime and release tooling Docker builds | Passed |
| Tooling image migration execution | Passed; no pending migrations |
| Tooling image administrator bootstrap | Passed with a disposable test account |
| Runtime dependency boundary | Non-root UID 1000, entrypoint present, Sharp loads, Prisma CLI absent |
| Hardened runtime smoke check | Read-only filesystem, dropped capabilities, no-new-privileges; live/ready HTTP 200 |
| Runtime HTTP headers | Request ID and `nosniff` verified |
| Missing production configuration | Startup rejected |
| Deployment Compose configuration and CI YAML | Parsed successfully |
| Changed-source whitespace | Passed |

The original container smoke test used test-mode local storage/log mail and the disposable
database. It does not validate real R2, SMTP, production database TLS, public HTTPS,
cross-origin browser cookies, backups, restore, monitoring or frontend deployment.
Those remain required staging/launch gates in [DEPLOYMENT.md](./DEPLOYMENT.md).
The integration suite emitted a node-postgres deprecation warning about overlapping
queries; all assertions passed. Recheck before upgrading to pg 9.

This downloaded workspace has no `.git` directory, so repository status, commit
and full `git diff --check` were unavailable. Selected original files were copied
to a temporary baseline before edits; changed source files were checked for
trailing whitespace. No Git history was initialized or replaced.

Disposable test containers and the temporary PostgreSQL process were stopped
after validation. Docker images remain local for review. No service was deployed
and no production credentials were created.

## Owner-purchased VPS preparation

The VPS kit in `deploy/vps/` was additionally exercised against isolated Docker
volumes: production-mode API startup, PostgreSQL 16 TLS with certificate and
hostname verification, plaintext connection rejection, non-superuser application
role, migrations, database backup and restoration into a temporary database all
passed. Caddy configuration validation passed without public certificate issuance.
Secret generator regression tests verify matching application credentials,
different administrator/JWT secrets, restrictive permissions, overwrite refusal
and invalid-origin rejection. Shell scripts passed syntax checks.

The production connectivity preflight compiles and is included in the tools image;
real R2/SMTP success is unverified because those resources do not yet exist. The
backup timer is a template, not installed or activated. Off-server encrypted backup
configuration, alert routing and restore retrieval require the purchased server
and destination account. Public HTTPS/DNS, email delivery and frontend browser
integration remain post-purchase staging gates. The server sizing in the VPS guide
is an estimate; no production load or throughput benchmark was performed.

An initial integration run with a partial test environment failed one health-route
assertion. Rerunning with the complete documented test environment passed all 51
tests. Use the CI environment for reproducing the suite; the local production TLS
health check independently passed.


## Revalidation — 2026-10-05

Locked installation passed again (796 packages audited, zero reported vulnerabilities).
Prisma generation, TypeScript checking, all 56 unit tests, all 51 integration tests,
and the production build passed. All three migrations applied to a fresh isolated
PostgreSQL 16 database; a separate shadow database confirmed no schema drift.
The existing local app database was not used by integration tests.

Integration startup and each destructive reset now reject non-test runtime mode,
missing/invalid connection URLs, and database names without a separate `test`
segment. A test-like database name is an accident-prevention guard, not a substitute
for provisioning an isolated database. The VPS rollout now runs the existing
read-only PostgreSQL TLS/R2/SMTP preflight before migrations and API replacement;
a regression test proves provider failure stops those steps.

An initial full integration run had one transient viewing-transition 401; its
isolated rerun and subsequent full suite passed. The cause was not established.
The pg overlapping-query deprecation warning remains. Actual R2/SMTP credentials,
public domain/server deployment, delivered emails, browser cross-origin cookies,
off-server backups and live monitoring remain unverified until infrastructure is
provided. No new production deployment or remote commit was performed in this run.
