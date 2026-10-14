# Local fullstack operation and validation

A7 Property now runs locally with the Next.js frontend, the actual NestJS API and PostgreSQL 16. The API is not deployed to production. No fixture API or bundled property catalog is used.

## Run the stack

Use Node 22 and PostgreSQL 16. On this Mac the working Node runtime is `/Users/aungpyaehein/.local/opt/node22/bin`; the existing Homebrew Node executable has a missing-library error. In a terminal:

```bash
export PATH="$HOME/.local/opt/node22/bin:$PATH"
npm run fullstack:setup
npm run fullstack:dev
```

`fullstack:setup` creates a new managed cluster under ignored `work/local-fullstack/postgres`, bound to `127.0.0.1:55432`. It generates distinct JWT secrets and a database password, applies the committed migrations, and writes private, ignored `backend/.env` and `.env.local` files. It refuses to overwrite unmanaged configuration. Re-running setup preserves data and applies only outstanding migrations. It seeds no accounts or catalog.

The runner expects `/opt/homebrew/opt/postgresql@16/bin`. On another machine, set `A7_PG_BIN` to the PostgreSQL 16 binary directory. Install PostgreSQL 16 before setup; on macOS it is available through `brew install postgresql@16`. Backend dependencies must already be installed with `npm ci` in `backend/`, and frontend dependencies with `npm ci` at the repository root.

- Frontend: <http://localhost:3000>
- API: <http://localhost:4000/api/v1>
- API readiness: <http://localhost:4000/api/v1/health/ready>
- PostgreSQL: loopback port `55432`, application database `a7_local`

```bash
npm run fullstack:status
npm run fullstack:test
npm run fullstack:stop
```

`fullstack:dev` supervises the API and frontend, rejects occupied ports, and writes their logs to `work/local-fullstack/`. Ctrl+C stops these processes while retaining PostgreSQL data. `fullstack:stop` also stops PostgreSQL, retaining the cluster. Stop checks the supervisor's process start time before signaling it, avoiding a recycled PID. Stop/setup/dev was tested and the local accounts, archived listing and document survived.

## Accounts, email and inventory

Create your own seeker or lister account through Sign in → Create account. This uses the real API and database. Local development uses `MAIL_DRIVER=log`: verification and password-reset links appear in the private `work/local-fullstack/backend.log`; **no email is delivered**. Open the relevant link to confirm the account before publishing or contacting owners. SMTP is required for actual email delivery.

Two clearly named local QA accounts were created through registration, and their email tokens were consumed through the real verification endpoint. A clearly labeled test listing was uploaded, published, used for browser checks, then soft-archived through its owner's API. The marketplace is therefore honestly empty until a user publishes inventory. The local QA account details are in private, ignored `work/local-fullstack/qa-accounts.json`; never include that file or development logs in a release.

Saved homes, inquiries, viewing requests and conversations use PostgreSQL in this configuration. Saved searches, comparison selection, recently viewed and workspace/profile preferences remain browser-local according to the existing product contract. Notification preferences and weekly reports have no configuration endpoint and are labeled unavailable. There is no OAuth, payment integration or live AI added by this work.

## Fixes required to connect the existing platform

- Fixed public listing/similar presentation so an array index cannot become a visibility scope and expose ownership-document fields. Both TypeScript compilation and document privacy now have regressions.
- Added migration `20261011150000_property_documents`: the existing Prisma schema referenced a missing `PropertyDocument` table and missing `PROPERTY_DOCUMENT` upload enum value. Without it, listing creation returned 400. The migration adds only the missing structures; the Prisma schema and every older migration are unchanged.
- Added an optional API bind address; the managed local API uses loopback. The existing default bind address is unchanged.
- Established request-time boundaries for live web listing routes. A real published record previously made Next production builds fail because the API retry handler swallowed Next's dynamic-rendering signal. Native static exports use build-time API snapshots instead.
- Preserved missing response times as null and removed invented CRM view/save counts. Contact messages now carry the chosen phone reply preference through the existing conversation endpoint.
- Viewing slots now use Myanmar time for submission and dashboard display, independent of a viewer's device timezone.
- Workspace settings restore browser preferences on reload and clearly distinguish them from server account details. Existing storage keys were centralized without renaming them.
- The frontend test runner gives rendered worker assertions the same API mode as the Vite build. Both configured and unconfigured builds are checked.

## Validation results — 11 October 2026

| Check | Result |
| --- | --- |
| Frontend strict TypeScript | Passed |
| ESLint | Passed; seven existing unused-variable warnings |
| Next production build with a real published API listing | Passed |
| `npm test`, server mode | Cloudflare production build; 51/51 tests passed |
| `NEXT_PUBLIC_API_URL= npm test`, device mode | Cloudflare production build; 51/51 tests passed |
| Existing mobile browser regressions | 3/3 passed in API mode |
| Backend strict TypeScript and production build | Passed; `dist/main.js` emitted |
| Backend unit tests | 58/58 passed, eight suites |
| `npm run fullstack:test` | 57/57 real PostgreSQL integration tests passed, five suites |
| Migration history versus existing Prisma schema | No difference detected |
| Backend `npm ci` | Passed against the unchanged lockfile |
| Real local API smoke checks | 24 passed |
| Real browser journeys | Login/session restore, search/map/detail, save/unsave, contact preference, viewing request, CRM pause/publish, confirmation and owner reply passed |
| Native static export with real published API IDs | Passed; not an APK/device connectivity test |
| Managed service stop/setup/restart and data retention | Passed |

The integration runner sets `A7_E2E_FRESH_DATABASES=true` and supplies a managed loopback test database. Each test receives a newly created database with the actual migrations; no application table is truncated or reset. Test databases are retained for inspection. The standard backend `test:e2e` command still requires a disposable database and uses its existing truncation helper; use `fullstack:test` for this safe local workflow.

Artifacts are under ignored `output/qa/` and `output/playwright/`, including `real-api-checks.json`, `local-fullstack-browser-results.json`, and `real-fullstack-owner.png`. This download has no `.git` metadata, so `git diff --check` and a commit were unavailable. Hash verification confirms unchanged lockfiles, Prisma schema, older migrations, backend auth sources, native Android files and `components/mobile/` screens. Shared inquiry, CRM, adapter and viewing helpers changed as described above.

## Production boundary

Production deployment and production configuration were not changed. Actual production email requires SMTP, production document/media storage requires the configured R2 service, and the backend needs its own HTTPS deployment and a production database. The previously reported shared dependency advisories still require a separate compatible security update; see `comprehensive-check-2026-10-11.md`. Do not describe this local validation as an unrestricted production release.

The native export check used an actual published local validation ID. A catalog-free static export still needs real published API IDs; this change does not invent fallback properties. Physical Android connectivity and an APK were not validated against a deployed API. The generated validation export is kept only as a QA artifact.

## Source inventory for this follow-up

Created: `scripts/local-fullstack.mjs`, `scripts/test-local-fullstack.mjs`, `scripts/test-frontend.mjs`, `lib/contact-message.ts`, `tests/contact-integration.test.mjs`, `backend/test/helpers/fresh-databases.ts`, the additive migration above, and this guide.

Modified: `package.json`, `AGENTS.md`, `app/page.tsx`, `app/listers/page.tsx`, `app/properties/[id]/page.tsx`, `lib/property-source.ts`, `lib/properties.ts`, `lib/api/property-adapter.ts`, `lib/local-storage.ts`, `lib/viewing-dates.ts`, `hooks/use-viewings.ts`, `components/property/inquiry-sheet.tsx`, `components/property/property-detail-sections.tsx`, `components/dashboard/property-crm.tsx`, `tests/property-source-resilience.test.mjs`, `tests/rendered-html.test.mjs`, `backend/src/main.ts`, `backend/src/properties/properties.service.ts`, `backend/test/properties.service.spec.ts`, `backend/test/marketplace.e2e-spec.ts`, `backend/test/helpers/app.ts`, and the earlier audit reports to point to these current results.

The earlier desktop marketplace inventory remains in `web-marketplace-implementation.md`. No production database, existing account, Android native source, mobile screen, dependency version, or older migration was changed.
