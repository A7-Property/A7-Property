# A7 Property backend

NestJS 11, PostgreSQL 16, Prisma 7 and JWT API for the A7 Property marketplace.

**Status:** the service is feature-complete and production-hardened in code, with migrations, moderation, scheduled maintenance, an audit trail, unit tests and integration tests that run against a real PostgreSQL instance. It is **not yet deployed**: no production database, R2 bucket, SMTP provider or API host has been provisioned.

With `NEXT_PUBLIC_API_URL` set, the Next.js UI runs against this API for every journey — accounts, discovery, search, property detail, saved homes, inquiries, viewings, messages, the seeker dashboard and the owner/agent CRM. Without it the UI stays on its device-local demo data. A few things remain device-local in both modes because no endpoint exists for them: recently viewed, saved searches, the comparison selection, profile preferences, and the CRM's listing-views/conversion analytics (which are labelled as illustrative).

A lister can create and publish real listings from the CRM: the editor collects every field the backend requires, uploads photos through `POST /uploads/property-image`, and surfaces publish, pause and archive controls. A lister can also open a thread with any seeker who requested a viewing (`POST /conversations/from-viewing`).

## Local setup

1. Node.js 22.18+ and PostgreSQL 16. The root `docker-compose.yml` provides both PostgreSQL and an optional Redis.
2. Copy the root `.env.example` to `.env`, set `POSTGRES_PASSWORD`, then `docker compose up -d postgres` (add `redis` if you want shared rate limiting).
3. Copy `backend/.env.example` to `backend/.env`. Match `DATABASE_URL` to your password and set two **different** random secrets of 32+ characters. Never commit `.env`.
4. In `backend/`: `npm ci`, `npm run db:generate`, `npm run db:deploy`, then `npm run dev`.
5. API at `http://localhost:4000/api/v1`, Swagger at `http://localhost:4000/api/docs`, health at `/api/v1/health/live` and `/api/v1/health/ready`.

The marketplace is real-data only: listings are created by real listers through the CRM. There is no demo catalog seed; do not seed fabricated inventory into a production database.

### First administrator

`ADMIN` is rejected by the public registration endpoint, so a moderator can only be created out of band:

```bash
ADMIN_BOOTSTRAP_EMAIL=you@example.org ADMIN_BOOTSTRAP_PASSWORD='a-long-random-password-1' npm run db:bootstrap-admin
```

It creates or promotes that account, marks its email verified, rotates its password, revokes its sessions and writes an audit entry. Remove both variables from the environment afterwards and change the password at first sign-in.

## API surface

All routes are under `/api/v1`. Every response body is `{ "data": ... }`; paginated routes add `meta`. Every error is `{ statusCode, error, message, requestId }`.

| Area | Endpoints |
| --- | --- |
| Auth | `POST register`, `login`, `refresh`, `logout`, `logout-all`, `change-password`, `deactivate`, `verify-email`, `resend-verification`, `forgot-password`, `reset-password`; `GET me`, `sessions`; `DELETE sessions/:id` |
| Properties | `GET /properties` (filters below), `GET /properties/:id`, `GET /properties/:id/similar`, `GET /properties/mine`, `GET /properties/mine/overview`, `POST /properties`, `PATCH /properties/:id`, `DELETE /properties/:id`, `POST /properties/:id/publish`, `POST /properties/:id/pause` |
| Saved | `GET /saved-properties`, `GET /saved-properties/ids`, `POST`/`DELETE /saved-properties/:propertyId` |
| Inquiries | `POST /inquiries`, `GET /inquiries`, `GET /inquiries/unread-count`, `GET /inquiries/:id`, `PATCH /inquiries/:id/status` |
| Messages | `GET /conversations`, `GET /conversations/unread-count`, `POST /conversations` (seeker), `POST /conversations/from-viewing` (lister), `GET /conversations/:id`, `GET`/`POST /conversations/:id/messages`, `PATCH /conversations/:id/read`, `PATCH /messages/:id/read` |
| Viewings | `POST /viewings`, `GET /viewings`, `GET /viewings/:id`, `PATCH /viewings/:id/status` |
| Uploads | `POST /uploads/property-image`, `POST /uploads/property-document`, `POST /uploads/identification`, `GET /uploads/document?url=...`, `POST /users/me/avatar` |
| Users | `GET`/`PATCH /users/me` |
| Admin | `GET /admin/overview`, `GET /admin/properties`, `PATCH /admin/properties/:id/verification`, `GET /admin/users`, `PATCH /admin/users/:id/status`, `POST /admin/users/:id/unlock`, `GET /admin/audit-logs` |
| Health | `GET /health/live`, `GET /health/ready` |

Search filters on `GET /properties`: `city`, `township`, `search`, `propertyType`, `listingType`, `furniture`, `minPrice`, `maxPrice`, `bedrooms`, `bathrooms`, `minArea`, `maxArea`, `amenities` (comma-separated; **all** must match), `verifiedOnly`, `sort` (`newest`, `oldest`, `price_asc`, `price_desc`, `area_desc`), `page`, `limit` (max 100).

## Security

**Authentication.** Passwords use Argon2. Access tokens are short-lived Bearer JWTs meant to be held in client memory. The refresh token rotates on every use, is stored only as a SHA-256 hash, and is delivered in an HttpOnly cookie scoped to `/api/v1/auth`. Presenting an already-rotated refresh token is treated as a leak and revokes every session for that user. `tokenVersion` lets a password change, reset, suspension or `logout-all` invalidate outstanding **access** tokens, not just cookies. Cookie-authenticated routes (`refresh`, `logout`) additionally check the `Origin` header, because a browser attaches that cookie on its own.

**Brute force.** Failed sign-ins are counted per account and per IP in PostgreSQL, so every replica shares the counters. Crossing `LOGIN_MAX_FAILURES` locks the account for `LOGIN_LOCK_MINUTES`, emails the owner and writes an audit entry; the correct password is refused while the lock holds. A scheduled sweep clears expired locks. Rate limiting is separate and per-route (5/min on registration and password reset, 10/min on login).

**Authorization.** `SEEKER`, `LISTER` and `ADMIN` are enforced by a global guard, with per-route role and verified-email requirements. `ADMIN` cannot be requested at registration. Listers cannot read or modify another lister's listing, and `verificationStatus` is not writable through any lister DTO — editing a verified listing returns it to `PENDING` for re-review. Publishing, inquiring, messaging and requesting a viewing all require a verified email.

**Moderation and accountability.** Administrators review verification, suspend or reactivate accounts and unlock locked ones. Suspension revokes sessions, invalidates access tokens and pauses that owner's published listings. Every security-relevant action is written to an append-only `AuditLog` with actor, target, IP and user agent, queryable at `/admin/audit-logs` and pruned after `AUDIT_RETENTION_DAYS`.

**Private documents.** Identification and property ownership images are private. Public `/media` access rejects their asset kinds, including legacy local paths. Owners and admins download through authenticated `GET /uploads/document?url=...`; the URL is an exact asset identifier, never an external fetch target. Attachment submission validates the upload's owner, kind and canonical URL. Listing writes and attachment consumption share one transaction, so an attachment failure rolls the listing write back. Concurrent identity retries for the same upload are serialized. Existing listing documents can be retained with `documentId` and their unchanged URL; an explicit empty documents array removes attachments. Identity submissions are pending review and do not verify an account automatically.

For R2, provision a distinct **private** bucket (`R2_PRIVATE_BUCKET_NAME`) with no public domain or r2.dev access and credentials permitting access. The service fails closed for private writes when this bucket is absent or equals the public bucket. Legacy R2 documents already in public storage require an operator migration: copy them to private storage, update their tracked storage key/identifier consistently, remove the public originals, and purge CDN caches. Deploying the API alone cannot revoke previously public R2 object URLs. Local legacy documents are protected by the media gate immediately. Cloud storage migration has not been run locally.

**Uploads.** Images must come through the multipart endpoint. The server decodes and re-encodes JPEG/PNG/WebP to WebP, which strips source metadata, and enforces a 10 MB upload and 25-megapixel decode ceiling. A listing can only reference assets its own owner uploaded. Unattached uploads are deleted after `UPLOAD_ORPHAN_RETENTION_HOURS`, and a replaced avatar is removed immediately.

**Transport and input.** Helmet sets HSTS (production), a restrictive CSP, `no-referrer` and `nosniff`; `X-Powered-By` is off. CORS is limited to the exact `FRONTEND_URL` origins with credentials. JSON bodies are capped at 256 KB and form bodies at 64 KB; oversized or malformed bodies return 413/400, not 500. DTO validation rejects unknown fields outright. Database errors are mapped to safe status codes and messages — connection strings, SQL and stack traces never reach a client. Every request carries an `X-Request-Id` that also appears in the error body and the logs; query strings and bodies are never logged.

**Operational limits.** The connection pool is bounded and a server-side statement timeout applies, so one slow query cannot exhaust the database. `TRUST_PROXY_HOPS` must be the real number of proxies: a larger value lets a client forge its own IP for rate limits and audit logs.

### Deliberately not implemented

No payments, no OAuth/social sign-in, no phone verification, no realtime sockets, and no automated listing fraud detection. Email is transactional only. Do not describe any of these as available.

## Scheduled maintenance

`@nestjs/schedule` jobs prune expired refresh sessions, email tokens and login attempts (hourly), delete orphaned uploads (6-hourly), prune audit logs (daily) and clear expired account locks (half-hourly). All are idempotent. Every replica would run them, so set `ENABLE_JOBS=false` on all but one.

## Rate limiting across replicas

Without `REDIS_URL` the counters live in each process, so N replicas each allow the full quota — the service logs a warning at boot. Set `REDIS_URL` to share them. If Redis is unreachable the request is allowed through rather than failing closed, and the error is logged.

## Testing

```bash
npx tsc --noEmit    # strict type check
npm test            # unit tests, no database needed
NODE_ENV=test npm run test:e2e    # DATABASE_URL database name must include a separate test segment
npm run build       # production bundle in dist/
```

`npm run test:e2e` truncates every table between tests, so point it at a throwaway database, never a real one. The suite now refuses missing configuration, a non-test runtime mode, or a database name without a separate `test` segment (for example `a7_property_test`) before opening the application or truncating tables. The integration suite covers registration, lockout, refresh rotation and reuse detection, email verification, password change, session revocation, deactivation, the full draft-to-published listing lifecycle, ownership enforcement, upload re-encoding and orphan cleanup, search filters, saves, inquiries, viewings, messaging with unread counts, admin verification and suspension, rate limiting, body limits and the error envelope. `.github/workflows/backend.yml` runs all of it against PostgreSQL and Redis, plus a schema-versus-migrations drift check.

## Production deployment

For an owner-purchased server, use the [VPS deployment kit](./deploy/vps/README.md):
API, private PostgreSQL 16 with verified TLS, Caddy HTTPS, secret generation,
ordered release deployment and tested backup/restore. Render is optional.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the release commands, hardened single-replica
Compose setup, separate migration/admin tooling image, staging gates and rollback procedure.
See [VALIDATION.md](./VALIDATION.md) for the latest local verification evidence and its limits.

1. **Provision.** PostgreSQL with TLS and backups, an HTTPS host for the API, a public Cloudflare R2 bucket for property images plus a separate private document bucket, a transactional SMTP provider, and Redis if more than one replica. Configure DNS, TLS, firewall rules, monitoring and a tested restore procedure with the provider.
2. **Configure.** Populate the host's secret manager from `.env.production.example`. Replace every placeholder, generate two unique JWT secrets, and set the exact `FRONTEND_URL` and `BACKEND_PUBLIC_URL`. Boot validation refuses to start on a placeholder value, a non-HTTPS origin, insecure cookies, local storage or mail, or a `DATABASE_URL` without `sslmode=require` or stricter. Set `TRUST_PROXY_HOPS` to the real proxy count and `APP_VERSION` to the release SHA.
3. **Migrate.** From a one-off job: `npm ci`, `npm run db:generate`, then `npm run db:deploy` **once per release, before starting the new API**. The runtime image deliberately ships without the Prisma CLI and never migrates at startup.
4. **Deploy.** Build `backend/Dockerfile` (non-root, health-checked). Point the platform's health check at `/api/v1/health/ready`. Run `npm run db:bootstrap-admin` once to create the first moderator. Keep `ENABLE_SWAGGER=false`.
5. **Verify.** Do a staging rollout with real PostgreSQL, R2 and SMTP, then exercise register, verify, reset, upload, create, publish, search, inquire, message, request a viewing, admin verification, suspension and `logout-all`.
6. **Connect the UI.** Set `NEXT_PUBLIC_API_URL` on the frontend and confirm cross-origin cookie behaviour, the verification and reset screens, and the migration away from device-local state.

Still the operator's responsibility and **not** provided here: alerting, distributed tracing, backup automation, a WAF, log retention policy, and an external penetration test.

## Commands

```bash
npm run dev                  # watch mode
npm run build                # dist/
npm start                    # node dist/main.js
npm run typecheck
npm test
npm run test:e2e
npm run db:generate
npm run db:migrate -- --name change_name   # development only
npm run db:deploy                          # release migration job
npm run db:bootstrap-admin                 # first administrator
```
