# A7 desktop marketplace implementation

The current working local fullstack setup and validation results are recorded in [local-fullstack.md](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/docs/local-fullstack.md). That guide supersedes the validation counts and backend/native-export blockers below. The earlier [comprehensive audit](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/docs/comprehensive-check-2026-10-11.md) remains a historical record and documents the pending shared dependency advisories.

The website now has an A7-branded desktop marketplace layout based on the supplied references. The existing mobile home/search views remain active below 1024 px, and `CAPACITOR_BUILD=1` retains their original route path at every viewport. This is a local implementation; no live deployment or production configuration was changed.

## Technical audit

- One Next.js 16.3.2 App Router / React 19.2.6 / strict TypeScript frontend. There was no separate website frontend to rebuild.
- Capacitor 8 packages the same frontend for Android. Framework7 is installed; the running screens are React components. Android sources and packaging scripts were retained.
- NestJS 11 backend with PostgreSQL 16, Prisma 7, Argon2 passwords, JWT access tokens, rotating HttpOnly refresh cookies, and SEEKER/LISTER/ADMIN authorization.
- Existing typed API client and property adapter; public listings are read through `lib/property-source.ts`. Without `NEXT_PUBLIC_API_URL`, no real inventory or sessions are available.
- Leaflet/React Leaflet maps, Tailwind 4, Base UI, source-owned dialogs, Framer Motion, and shared English/Myanmar language state. The supplied bold Z06 Walone font remains unchanged.
- Saved homes, inquiries, viewing requests, and message conversations already integrate with the API. S3-compatible image uploads remain unchanged.
- This downloaded folder has no `.git` metadata. File hashes were recorded before editing instead of relying on a Git worktree diff.

## Features implemented

- White desktop top navigation, centered A7 logo, account links, language switcher, and compact left journey rail. Unsupported Updates is labelled Soon and has no action.
- Wide original A7 property hero with Buy/Rent selection and location/name search.
- Recommended, featured, and recently listed sections from API records; honest empty states; Buy/Rent/List action cards; Myanmar location links. Featured is an editorial selection of verified records, not a new promotion API. Recommendations use the existing deterministic ranking, not a new personal recommendation service.
- Shared Buy/Rent map/results layout at `/search?purpose=sale` and `/search?purpose=rent`, two-column listing grid, separately scrollable results, sorting, and pagination.
- Search API parameters for price, rooms, property type, furnishings, amenities, verification, listing type, text search, sort, and page. Query state persists in URLs and supports reload/back navigation.
- API pagination metadata supplies the total; only the current page's real coordinates become markers. Missing coordinates remain absent from the map. Map selection scrolls/highlights the corresponding card; Show on map selects its marker.
- Property detail links and existing saved-home hook; the hook is shared once per view rather than requested per card. Arbitrary backend image URLs are rendered with ProgressiveImage and a missing-photo state.
- Browser-local saved search bookmarks at `/saved-searches`, using the existing centralized storage key and change events. No seeded bookmarks, account synchronization, or email alerts.
- `/listers` groups the owner/agent fields already present on published properties. Search by name or listing location, with contact through a property detail inquiry. Counts explicitly describe the currently shown homes, not an exhaustive agent directory.
- English/Myanmar copy, visible focus, existing dialog semantics, reduced-motion CSS, and one active route H1.
- Existing RequireAuth and role permissions remain intact. List Property opens `/owner`; seekers do not acquire listing permissions.

The existing map tile host displayed API-key-required tiles during verification. The shared map gained an optional tile URL; its original default is unchanged. The desktop map uses the standard OpenStreetMap tile URL and visible attribution. That service has best-effort availability, as described in the [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/).

## Existing APIs reused

| Capability | Integration |
| --- | --- |
| Discovery, filters, sorting, pagination | `GET /properties` via server property source and existing browser `listProperties()` |
| Detail and lister inquiries | Existing `/properties/[id]` experience, `GET /properties/:id`, and existing inquiry/viewing/message hooks |
| Saved homes | Existing `useSavedHomes` and `/saved-properties` / `/saved-properties/ids` endpoints |
| Identity and roles | Existing AuthProvider, refresh-cookie flow, RequireAuth, and account destinations |
| Listing management | Existing role-protected owner workspace and listing APIs; no new mutations |
| Images | URLs already supplied by listing responses; uploads/storage were not changed |

The API contracts and backend code were not changed. The legacy mobile search still receives its existing server-selected collection; desktop search receives a filtered page and uses paginated API requests for subsequent filter changes.

## Missing capabilities and verification limits

- No configured live API endpoint in this workspace. Empty states were verified; live accounts, database inventory, authenticated saves, inquiries, and populated map/card flows require the existing API to be available. Unit contract tests verify filter translation, API envelopes, pagination, and outages without modifying a database.
- No public agent directory, public agent photos, agency fields, sales history, or independent agent ratings endpoint. The new page uses only permitted listing contact information.
- No mortgage/BuyAbility qualification service, automatic property alerts, saved-search synchronization, OAuth, payments, or live AI was added.
- Existing server collection reads are bounded at 500 homes. The lister page describes listers represented by the shown records rather than claiming exhaustive coverage.
- Native static export is currently blocked by the unchanged `/properties/[id]` route returning an empty `generateStaticParams()` array without a configured listing API. Next.js compilation and TypeScript completed; the route collection stage failed. No fake listing IDs or changes to the mobile export logic were introduced.
- No APK/device runtime test, backend integration test, database migration, or production deployment was run.

## Validation

| Check | Result |
| --- | --- |
| `npm ci` | Passed using the existing lockfile; dependencies unchanged |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed, with seven pre-existing unused-variable warnings |
| `npm test` | Cloudflare production build and 39 Node regression tests passed |
| `npm run test:browser` | Three existing mobile tests passed: search URL persistence, auth redirect, language persistence |
| Desktop interaction smoke checks | Passed: price validation, URL filters, sorting, browser-local save, and reload persistence |
| Responsive browser checks | Passed at 320, 390, 768, 1024, 1440, and 1920 px: no horizontal overflow, one visible H1, no broken visible images, no page errors |
| Myanmar checks | Passed: Walone, zero letter spacing, language persistence, and no overflow on new desktop/mobile web pages |
| axe WCAG 2/2.1 A/AA checks | Passed for the new homepage, empty search, lister page, and saved searches |
| `npm run build:android:web` | Compiled and passed TypeScript; static export blocked by existing empty property static params |
| `git diff --check` | Unavailable: this folder is not a Git repository; new/touched source whitespace checked separately |
| Protected-file hash comparison | 243 original protected files checked, zero changes: backend, DB/Prisma/migrations, Android, authentication, existing mobile screens, dependencies, and production configurations unchanged |

The mobile test selector was corrected from Done to the existing Apply filters button. The mobile screen was not changed. A pre-existing frontend admin API `any` annotation was changed to `unknown` to clear the lint error; runtime behavior is unchanged.

Browser screenshots and check scripts are saved under `output/playwright/` (ignored artifacts).

## Files created

- [app/listers/page.tsx](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/app/listers/page.tsx)
- [app/saved-searches/page.tsx](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/app/saved-searches/page.tsx)
- [components/web/lister-discovery.tsx](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/components/web/lister-discovery.tsx)
- [components/web/marketplace.css](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/components/web/marketplace.css)
- [components/web/responsive-marketplace.tsx](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/components/web/responsive-marketplace.tsx)
- [components/web/saved-searches.tsx](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/components/web/saved-searches.tsx)
- [components/web/web-home.tsx](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/components/web/web-home.tsx)
- [components/web/web-property-card.tsx](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/components/web/web-property-card.tsx)
- [components/web/web-search.tsx](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/components/web/web-search.tsx)
- [components/web/web-shell.tsx](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/components/web/web-shell.tsx)
- [hooks/use-web-saved-searches.ts](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/hooks/use-web-saved-searches.ts)
- [hooks/use-web-search.ts](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/hooks/use-web-search.ts)
- [lib/web-search.ts](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/lib/web-search.ts)
- [tests/web-marketplace.test.mjs](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/tests/web-marketplace.test.mjs)
- [docs/web-marketplace-implementation.md](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/docs/web-marketplace-implementation.md)

## Files modified

- [app/page.tsx](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/app/page.tsx)
- [app/search/page.tsx](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/app/search/page.tsx)
- [components/property/property-map.tsx](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/components/property/property-map.tsx)
- [lib/api/admin.ts](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/lib/api/admin.ts)
- [lib/property-source.ts](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/lib/property-source.ts)
- [tests/browser/core-journeys.spec.ts](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/tests/browser/core-journeys.spec.ts)
- [tests/property-source-resilience.test.mjs](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/tests/property-source-resilience.test.mjs)
- [tests/rendered-html.test.mjs](/Users/aungpyaehein/Downloads/A7-Property-VV6-main/tests/rendered-html.test.mjs)
# Follow-up status

The later fullstack request authorized necessary backend fixes, an additive missing migration, and isolated local PostgreSQL/API configuration. Current source changes, runtime commands and real integration results are recorded in [local-fullstack.md](local-fullstack.md); the original frontend-only protection statements below describe the earlier implementation phase.
