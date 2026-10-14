# Production configuration audit — 2026-10-07

Status: repository checks pass after the fixes below; a live production launch is not yet verified. No production deployment or access policy was changed.

## Fixes in this audit

- Listing collection reads now retry once with a 10-second timeout per attempt and return empty arrays when the API is unavailable. No fabricated inventory is substituted. Individual property API outages still raise errors so an outage is not presented as a missing property.
- R2 writes and deletes now have 20-second and 10-second request timeouts respectively, limiting stalled upload/cleanup requests.
- Production configuration rejects unencrypted Redis URLs. Redis remains optional for a single replica; use `rediss://` when configured.
- Production configuration refuses `ALLOW_DEMO_CATALOG_SEED=true`.
- Added executable regression coverage for listing outage/retry behavior and production environment rejection rules.

## Existing controls reviewed

- Production environment validation requires separate JWT secrets, HTTPS origins, secure cookies, remote R2 storage, SMTP configuration and PostgreSQL TLS; templates contain placeholders rather than real credentials.
- Backend Docker builds use `npm ci`, run as the unprivileged node user and expose a readiness health check. Runtime Compose configuration drops capabilities, disables privilege escalation and uses a read-only filesystem.
- VPS rollout validates configuration and real PostgreSQL/R2/SMTP connectivity before migrations and API replacement.
- VPS PostgreSQL is isolated from public ports. Backup publication checks archive structure; restore verification uses a temporary database.
- Refresh sessions use HttpOnly cookies, origin checks on cookie-authenticated routes and shared client refresh handling. Production browser session restoration must still be tested across the actual frontend/API domains.
- Profile photos are converted to WebP with input byte/pixel limits. Avatar attachment is transactional and replaced assets are cleaned up.
- Ownership triggers prevent seeker ownership and serialize ownership checks with role changes.

## Validation

Frontend: TypeScript, ESLint, vinext production build and Node regression tests. Backend: TypeScript, unit tests, production build and integration tests on newly created disposable databases. Prisma migration/schema drift checked using a separate shadow database. The unchanged backend lockfile was validated with a successful isolated `npm ci` earlier in this session.

This downloaded workspace has no `.git` metadata, so Git history/status and `git diff --check` are unavailable. Changed-file whitespace checks are performed instead. No dependency versions or lockfiles changed in this audit.

## Launch requirements still unverified

1. Provision the actual API host and production database; populate the production secret manager, pin a release and run the provided provider preflight and migration rollout. Docker image execution and remote rollout have not been exercised by this audit.
2. Configure the real R2 bucket/public image domain. Preflight checks bucket access, but a real write, public image read and delete must also pass.
3. Configure SMTP and sender DNS. SMTP connectivity verification does not prove mailbox delivery; exercise verification/reset emails and token expiry.
4. Build the frontend with the production `NEXT_PUBLIC_API_URL` and publish using the repository's Sites workflow. Verify credentialed CORS and refresh-cookie persistence in the supported browsers on the final domains.
5. Configure uptime/error alerts and resource monitoring. Schedule backups, copy them off the database host, establish retention and perform a restore drill. These operator services cannot be proven from source alone.
6. Exercise real account, listing, messaging, inquiry and viewing flows on the deployed release, including role restrictions, logout/session revocation and API outages.

Do not label the live service production-ready until these requirements have evidence.
