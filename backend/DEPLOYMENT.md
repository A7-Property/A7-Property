# Production release runbook

For the selected owner-purchased VPS path, start with
[deploy/vps/README.md](./deploy/vps/README.md). The generic commands below support
external infrastructure; the VPS kit adds a private TLS database and HTTPS ingress.

The source can be validated locally, but a release is not ready for traffic until
staging passes with real PostgreSQL 16, R2 and SMTP. No infrastructure or live
deployment is created by these files.

## Provision and configure

Provision PostgreSQL 16 with TLS and automatic backups, R2 with an HTTPS public
image domain, a verified transactional SMTP sender, and an HTTPS API host. Use
Redis for multiple replicas. Keep the database and Redis off the public internet
where the provider supports private networking. Test a backup restore before launch.

Copy `.env.production.example` into a secret manager or a file outside this
repository readable only by the operator. Replace every placeholder. Set
`FRONTEND_URL` to exact HTTPS origins (no paths or query strings), with the primary
frontend first because email links use it. `BACKEND_PUBLIC_URL` and `R2_PUBLIC_URL`
must also be HTTPS origins. Use different randomly generated JWT secrets; do not
put secrets in shell arguments, commits, images or chat.

Set `TRUST_PROXY_HOPS` to the actual proxy count. Restrict direct access to the API
to that proxy. Set `APP_VERSION` to the release revision. Run scheduled jobs on
exactly one replica. The Compose example runs one replica on loopback port 4000;
place an HTTPS reverse proxy on the same host in front of it. A managed container
platform can instead run the runtime image directly with its own secret manager,
ingress, readiness check and shutdown grace period.

## Validate the source

With Node 22.18+ and a dedicated disposable PostgreSQL 16 database:

```sh
npm ci
npm run db:generate
npm run typecheck
npm test
npm run db:deploy
npm run test:e2e
npm run build
npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code
```

Set `DATABASE_URL` and `SHADOW_DATABASE_URL` to separate disposable databases for
this validation. Integration tests truncate all application tables. Never run
them against staging inventory or production. Confirm `dist/main.js` exists.

## Build, migrate and start

From `backend/`, export `A7_RELEASE_TAG` as an immutable release revision and
`A7_BACKEND_ENV_FILE` as the absolute path of your production secret file.

```sh
docker compose -f compose.production.yml --profile release build
docker compose -f compose.production.yml run --rm tools npm run db:deploy
docker compose -f compose.production.yml up -d --no-build api
docker compose -f compose.production.yml ps
```

Migrate once before starting the new runtime. The runtime never auto-migrates or
seeds. The `tools` image includes Prisma CLI and the generated client; the runtime
omits development tooling. Store both images in your registry with immutable tags
or digests. Do not deploy the tools image as a long-running API.

For the first administrator, supply `ADMIN_BOOTSTRAP_EMAIL` and
`ADMIN_BOOTSTRAP_PASSWORD` through the secret manager or temporary secret file,
then run:

```sh
docker compose -f compose.production.yml run --rm tools npm run db:bootstrap-admin
```

Remove the bootstrap variables immediately afterwards. This command also promotes
an existing account, changes its password and revokes its sessions; run only for
the intended administrator. Never seed the demo catalog into production.

## Staging and launch gates

Check `/api/v1/health/live` and `/api/v1/health/ready` through HTTPS. Configure
readiness at the latter, and alert on failures, 5xx responses, database exhaustion,
SMTP delivery errors, Redis errors and failed scheduled cleanup. Readiness checks
the database only; verify SMTP, R2 and Redis separately. Redis outages currently
allow requests without distributed rate limiting and log an error.

Exercise register, real email verification, password reset, refresh, logout-all,
image upload, draft creation, publish/pause/archive, search, saves, inquiry,
viewing, messaging, admin verification and suspension. Check that Swagger is
disabled, security headers are present, CORS rejects an unrelated origin and
refresh cookies are Secure/HttpOnly. Confirm browser refresh works on your actual
frontend/API domain pair; cross-site cookies can be blocked by browser policy.

Only after staging passes, set frontend `NEXT_PUBLIC_API_URL` to
`https://YOUR_API_DOMAIN/api/v1`, rebuild and deploy the frontend using the
repository's Sites workflow. Check both seeker and lister journeys against real
API records. Do not launch with demo inventory or fallback success claims.

## Rollback and operation

Keep the previous image digest and release configuration. Review migrations for
backward compatibility before rollout. If the previous runtime is compatible
with the new schema, restore its image tag and redeploy. Do not automatically
reverse migrations; an incompatible schema requires a reviewed forward fix or a
tested database restore with an explicit data-loss/recovery plan.

The Compose example bounds local container log files; send logs to your provider's
collector for durable retention. Monitor backups and periodically repeat restore
tests. Record staging evidence, operator, image digest, migration revision and
release time for each production rollout.
