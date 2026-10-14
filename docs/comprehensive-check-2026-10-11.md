# Comprehensive verification — 11 October 2026

**Historical audit:** the subsequent request to make fullstack work authorized the backend fixes and local setup. The public-document patch is now applied, the missing additive migration is supplied, and local PostgreSQL/API/browser checks pass. See [the current local fullstack results](local-fullstack.md). The dependency advisories and production deployment boundary described below remain relevant.

At the time of this initial audit, the frontend passed its production builds and regression checks, while the backend privacy/compile issue and lack of configured API remained unresolved. Those backend/local-runtime blockers have since been fixed as documented above. No unrestricted production release has been made.

## Frontend fixes applied

- Added the required `Suspense` boundary in `app/sign-in/page.tsx`. The normal Next.js production build previously failed when the existing sign-in view called `useSearchParams()`. Authentication logic and its components are unchanged.
- Made explicit `purpose=rent` win over a stale legacy `mode=buy` URL value.
- Added a 15-second desktop search deadline. A stalled public API read now ends the skeleton, shows the outage/retry state, and ignores late results. This deadline does not change the shared session or refresh transport.
- Sized desktop price markers to fit their text and provide a 44 px target. Added listing titles to markers and an opt-in keyboard selection handler so Enter synchronizes the desktop map and results. The shared map's original tile URL and keyboard-selection default remain unchanged for existing screens.
- Added tests for the URL precedence, build boundary, stalled requests, concurrent refresh rotation, requested-URL preservation, and seeker/lister permissions.

Modified during this follow-up: `app/sign-in/page.tsx`, `lib/web-search.ts`, `hooks/use-web-search.ts`, `components/web/marketplace.css`, `components/web/web-search.tsx`, `components/property/property-map.tsx`, and `tests/web-marketplace.test.mjs`. Created `tests/api-client-compatibility.test.mjs` and this report. The earlier implementation inventory remains in `docs/web-marketplace-implementation.md`.

## Release blockers

### P1 — public listing collections can include ownership documents

`backend/src/properties/properties.service.ts:83` and `:112` pass `presentProperty` directly into `Array.map()`. Map supplies the array index as the second argument; the presenter treats that argument as its visibility scope. A numeric index is not `"public"`, so the presenter's document-removal branch does not execute.

This causes two TS2345 compiler errors and can leave document fields in public collection/similar-home responses if compilation is bypassed and records contain documents. A pure presenter reproduction confirmed this behavior without reading any database or real document. No live disclosure or exploitation was tested.

The proposed change explicitly supplies the public scope at both call sites:

```ts
records.map(property => presentProperty(property, "public"))
```

A reviewable proposal, including two privacy regression tests, is saved at [proposed-backend-public-documents.patch](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/output/qa/proposed-backend-public-documents.patch). It was **not applied** to the repository. In an isolated `/tmp/a7-backend-review` copy, the proposal passed type checking, all 58 unit tests, and the production build with `dist/main.js` present. No migration, API contract expansion, authentication change, or database connection was needed for those checks.

### P1 — shared dependency advisories need a separate validated update

`npm audit` was run against both existing lockfiles without changing them. These are counts of affected dependency entries, not independent vulnerabilities or demonstrated exploitability.

| Lockfile scope | Critical | High | Moderate | Total |
| --- | ---: | ---: | ---: | ---: |
| Frontend, all dependencies | 3 | 27 | 13 | 43 |
| Frontend, production dependencies | 2 | 3 | 1 | 6 |
| Backend, all dependencies | 1 | 0 | 0 | 1 |
| Backend, production dependencies | 0 | 0 | 0 | 0 |

The critical frontend entries include installed Next.js 16.3.2 and Capacitor Android 8.5.0; the all-dependency audit also flags `proxy-addr`. Relevant advisories include [Next.js AVIF image optimization](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4), [Capacitor internal HTTP proxy origin](https://github.com/advisories/GHSA-rvm3-566m-v7fv), and [proxy-addr trust subnet handling](https://github.com/advisories/GHSA-jqcg-44mw-7w3h). Their runtime conditions differ; a package audit alone does not establish exposure on the current Cloudflare deployment.

The backend entry is Handlebars 4.7.9 through **dev-only ts-jest**, not a production dependency. The [AST compilation advisory](https://github.com/advisories/GHSA-8r5x-fm3f-whwj) concerns untrusted objects passed to compilation. No application Handlebars usage was found in backend source. Raw audit reports are saved under `output/qa/`.

No `npm audit fix` or dependency update was run. Several suggested fixes affect the shared web/native stack, and some require major tool changes; they need compatibility validation rather than an automatic blanket update.

### P2 — native export still needs a supported property-detail strategy

`npm run build:android:web` compiles successfully and passes its TypeScript stage, then fails because the unchanged `/properties/[id]` route supplies an empty `generateStaticParams()` array while `output: export` requires at least one route. The workspace has no configured listing API. No fake IDs were introduced. APK/device validation therefore remains unavailable.

## Checks executed

| Check | Current result |
| --- | --- |
| Frontend `npx tsc --noEmit` | Passed |
| Frontend `npm run lint` | Passed; seven existing unused-variable warnings |
| Frontend `npm run build` | Passed after fixing sign-in's Suspense boundary |
| Frontend `npm test` | Cloudflare production build plus **45/45** Node tests passed |
| `npm run test:browser` | **3/3** existing mobile tests passed against Next production |
| Production route browser audit | **44 checks**: 22 public/protected routes at 390 and 1440 px; one visible H1, no horizontal overflow, no broken visible images, no page exceptions, expected signed-out redirects |
| Production English/Myanmar checks | Passed shared language persistence, Walone font and zero letter spacing, and tested small/large viewport overflow |
| WCAG axe checks | No WCAG 2/2.1 A/AA violations in the new homepage, empty search, listers, saved searches, and populated desktop search |
| Isolated populated API contract browser checks | Passed 24-card page/27-result metadata, missing-coordinate exclusion, real-field adapter rendering, mixed verification, image fallbacks, card-to-map and keyboard marker-to-card selection/scrolling, page 2/back, sorting, rent labels, visitor save restrictions, outage/recovery, saved bookmark, lister name filtering |
| Deliberately stalled public read | Passed 15-second outage state and subsequent search recovery |
| Built Cloudflare runtime smoke | Passed honest API-unconfigured state, search history state, saved bookmark and no overflow |
| Backend `npm ci` | Passed against unchanged lockfile; Prisma client generated without database access |
| Repository backend typecheck/build | **Failed**, two TS2345 errors at the public presenter map call sites |
| Repository backend unit tests | **7/8 suites passed, 52 tests passed**; property suite blocked by those compile errors |
| Backend proposal in temporary copy | Typecheck/build passed; **8/8 suites and 58/58 tests passed**; `dist/main.js` emitted |
| Native export | Compile/type stage passed; blocked by empty property static params |
| Database integration, migrations, real email/upload/account journeys | Not run: no configured API/disposable database; integration setup truncates tables and the user's request prohibits it |
| Protected source comparison | **246 original protected files, zero changes** across backend, schemas/migrations, Android, mobile/auth components, shared auth client, public assets, lockfiles, scripts and production configurations |
| Git diff check | Unavailable because this downloaded archive has no `.git`; changed source whitespace checked separately |

Populated contract checks used explicitly named QA fixtures in a separate localhost process and browser. They were never added to the application's catalog, production environment files, account store, or database. Those processes are stopped. Expected fixture 401/404/outage responses and vinext development image-host warnings were recorded; they are not production page exceptions. These checks establish frontend contract behavior, **not** live NestJS/database integration.

The earlier responsive audit also checked 320, 390, 768, 1024, 1440 and 1920 px. The current production route audit expands route coverage at 390/1440, and the repeated Myanmar checks include 320/1024/1440.

## Preserved state and remaining work

- Existing API endpoints, roles, HttpOnly refresh behavior, ownership guards, image storage, database schema and migration history are unchanged.
- No database was created/reset/truncated, no migration was executed, and no existing accounts were changed. The code-generation URL was a process-only placeholder; Prisma generation does not connect to a database.
- No dependency or production environment files changed. No site was deployed and no hosting access was changed.
- Desktop supports the API's single property-type filter. The legacy mobile multi-type and drawn-area filters are not equivalent desktop API features; these are not new backend capabilities.
- Discovery/lister collection reads remain bounded at 500 records, as before. Desktop search additionally uses the paginated API response; the legacy mobile dataset is retained to preserve its screen behavior.
- The user's normal preview is restored at [localhost:3000](http://localhost:3000/).
- Applying the reviewed backend proposal requires explicit approval under the original instruction: **“Do not modify backend code without explicit approval.”** Dependency upgrades and any native export redesign should be handled as separate changes with web/native compatibility checks.
