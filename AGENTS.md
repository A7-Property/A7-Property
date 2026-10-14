<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# A7 Property agent guide

This file is the durable handoff for agents working in this repository. Read it before changing code. When this file conflicts with older product/design documents, the running source and the rules below are the current contract.

## Product and scope

A7 Property is a mobile-first Myanmar property marketplace frontend. It supports home discovery, rent/buy search, property details, saving and comparing homes, inquiries/viewings, messages, a seeker dashboard, owner/agent CRM journeys, and a deterministic home-matching assistant.

- The UI runs in one of two modes, decided by `NEXT_PUBLIC_API_URL`:
  - **device mode** (variable unset, how the deployed site runs today): there are no listings and no server-backed accounts; the marketplace renders honest empty states and browser-local journeys contain only the viewer's own activity.
  - **server mode** (variable set): every journey is backed by the NestJS API in `backend/` — accounts and sessions, email verification and password reset, listing discovery, search, property detail, comparison, saved homes, inquiries, viewing requests, message threads, the seeker dashboard and the owner/agent CRM.
- Still device-local in **both** modes, because no endpoint exists for them: recently viewed, saved searches, comparison selection, and profile preferences. The CRM's listing-views/conversion analytics were removed rather than kept as fabricated numbers.
- `isApiConfigured()` in `lib/api/client.ts` is the single check for which mode is active. Never let a component claim a server session that is not configured, and never let a server-mode screen show demo fixtures: an unreachable API yields an empty list, never invented records.
- Do not invent APIs, databases, payments, analytics, or live AI unless the user explicitly expands the scope. The backend is real, but only the endpoints in `backend/README.md` exist.
- Keep simulated actions honest in the UI. Anything still device-local — messaging, viewing requests, listing edits, saved homes, the assistant — must remain labelled as browser/device-local demo behavior. There is no OAuth on either side: server mode must say social sign-in is unavailable rather than fake it.
- Verification copy must reflect each record's actual `verification_status`; never imply that every listing is verified.
- The user normally communicates in Myanmar. Reply in Myanmar when they do, while keeping technical names/commands in English where clearer.

## Runtime stack

- Node.js 22
- Next.js 16 App Router + React 19 + strict TypeScript
- Tailwind CSS 4, source-owned UI primitives, Base UI, Framer Motion
- Leaflet/React Leaflet for maps
- vinext/Vite for Cloudflare Sites builds
- Capacitor for the optional Android wrapper
- Local mock data has been removed. Discovery, search and property detail read exclusively from `lib/property-source.ts`, which serves the API's records in server mode and an honestly empty marketplace in device mode.
- Backend service in `backend/`: NestJS 11, PostgreSQL 16, Prisma 7, Argon2, JWT, `@nestjs/schedule` maintenance jobs, optional Redis for shared rate limits. See `backend/README.md` for the endpoint list, the security model and the deployment checklist. It is production-hardened in code but **not deployed**.

Read the relevant local Next.js guide under `node_modules/next/dist/docs/` before using or changing a Next API. This project deliberately follows the installed Next 16 behavior, including `next/image`'s `preload` API rather than deprecated `priority` usage.

## Quick commands

```bash
npm run dev:next          # Next dev server at http://localhost:3000
npm run dev               # vinext/Cloudflare-compatible dev mode
npm run lint              # ESLint
npx tsc --noEmit          # strict type check
npm test                  # Cloudflare production build + all Node regression tests
npm run build:cloudflare  # production Sites artifact in dist/
npm run android:apk       # optional Android debug APK flow
```

Do not run both development servers on the same port. Never edit generated `.next/` or `dist/` output by hand.

The local fullstack runner uses Node 22 and PostgreSQL 16 (`A7_PG_BIN` may point to its binary directory):

```bash
npm run fullstack:setup   # new managed cluster on 127.0.0.1:55432; refuses existing unmanaged .env files
npm run fullstack:dev     # frontend :3000 and API :4000, loopback only
npm run fullstack:status
npm run fullstack:test    # real API integration; a fresh database per test, no table truncation
npm run fullstack:stop    # stops services, retains data
```

Managed local configuration, database data and development email logs live in ignored `work/local-fullstack/`, `backend/.env` and `.env.local`. Mail uses `log`: verification/reset links are written to the private backend log and no email is delivered. Setup seeds no accounts or property catalog. The default `npm test` wrapper passes the selected Vite API mode to rendered HTML tests; also run `NEXT_PUBLIC_API_URL= npm test` to check device mode.

## Route map

Public routes:

- `/` — home discovery
- `/search` — rent/buy filtering and results
- `/properties/[id]` — server-resolved property detail
- `/compare` — device-local comparison, maximum four homes
- `/assistant` — deterministic browser-based matching demo
- `/community`, `/help`, `/privacy`, `/terms`, `/sign-in`
- `/verify-email`, `/reset-password`, `/forgot-password` — the targets of the backend's transactional emails. They must keep working in device mode by stating plainly that no API is configured, and must never imply an address was confirmed or an email sent. All three are `noindex`.

Auth-bound routes:

- Seeker: `/dashboard`, `/saved`
- Lister: `/owner`, `/agent`
- Either signed-in role: `/messages`, `/profile`

`RequireAuth` owns route guarding and saves the requested URL in `sessionStorage` under `a7-auth-return-to`. Keep redirects replace-based so the sign-in page does not pollute browser history. Marketplace account roles are `seeker` and `lister`; signing in restores the role returned by the API.

The API owns registered account roles: selecting lister at sign-in does not promote a seeker. `/owner` and `/agent` use `roleMismatchFallback` to explain denied listing access without automatically redirecting to an unrelated dashboard. Marketplace listing actions use `/owner?create=1`; only a signed-in lister can mount the editor. Guests keep that return URL and sign in through `/sign-in?role=lister`.

## Architecture boundaries

- `app/*` — route entries, metadata, server selection, sitemap/robots, global providers
- `components/layout/*` — headers, navigation, shells, route transitions
- `components/mobile/*` — primary mobile discovery/saved/messages/profile journeys
- `components/property/*` — cards, galleries, details, maps, inquiry flows
- `components/search/*` — search state, filters, cards, map/list controls
- `components/dashboard/*` — seeker dashboard and owner/agent CRM
- `components/assistant/*` — assistant UI and recommendations
- `components/ui/*` — reusable source-owned primitives
- `components/i18n/*` — shared language state and switcher
- `components/auth/*` — server-backed identity, guards and account email flows
- `lib/properties.ts` — client-safe property types, formatters, filters, and sort helpers
- `lib/local-storage.ts` — resilient storage helpers and cross-component change events
- `lib/api/*` — typed browser client for the backend. `client.ts` owns the transport, the error envelope (`{ statusCode, error, message, requestId }`), the in-memory access token and the shared refresh. Concurrent 401s must keep sharing one refresh call: the backend treats a replayed refresh token as a leak and revokes every session. `property-adapter.ts` maps an `ApiProperty` onto the `Property` shape every view consumes.
- `lib/property-source.ts` — **server components only.** The one place routes read listings from; returns the API's records in server mode and an empty list in device mode. A client component must never import it — pass records down as props.
- `Property.listing_status` tracks a lister's own view of their listing (DRAFT, PUBLISHED, PAUSED, SOLD, RENTED, ARCHIVED). Server mode uses the API's value; without an API there are no listings. `verification_status` is the independent trust signal for a published home.
- `hooks/use-saved-homes.ts`, `hooks/use-conversations.ts`, `hooks/use-viewings.ts`, `hooks/use-lister-portfolio.ts` — the dual-mode state the journeys share. Each owns both modes behind one interface; add a journey's state here rather than reading storage or calling the API from a view.
- `backend/src/*` — `common/` (guards, config validation, error filter, request context, Redis throttler storage), `auth/`, `admin/`, `audit/`, `maintenance/`, plus one module per domain area
- `tests/*` — rendered HTML and source regression contracts

Route data selection goes through `lib/property-source.ts`. There is no bundled catalog anywhere in the tree: do not add one, and never present invented listings as real inventory. Prefer server components for route data selection and metadata. Add `"use client"` only where browser state, storage, events, or interaction requires it. Pass the smallest serializable dataset from a server route into a client view.

There is no bundled property catalog. Keep pure helpers in `lib/properties.ts`; pass route-specific records into client hooks/components. The search route must not regain a client-side data chunk.

Root provider order in `app/layout.tsx` is intentional:

```text
LanguageProvider
  AuthProvider
    ToastProvider
      route content
      ComparisonTray
      MobileBottomNav
```

The global `MobileBottomNav` must stay hidden on `/dashboard`, because the seeker dashboard supplies its own mobile journey navigation. CRM mobile navigation prioritizes Overview, Properties, Messages, Verification, and Settings.

## Language and Myanmar typography contract

The user's supplied Myanmar face is the required font for **all Myanmar UI text**.

- Font asset: `public/fonts/z06-walone-bold.ttf`
- CSS family: `Z06 Walone`
- Source of truth: `app/globals.css`
- The supplied file is a bold face and must remain declared as `font-weight: 700`; do not fake a `400 900` variable range.
- When the shared language is Myanmar, `html[lang="my"]` switches display/text variables and semantic text controls to Walone.
- Keep Myanmar letter spacing at zero and allow taller line height. Compact 8–11 px utilities are deliberately raised to a readable size in Myanmar mode.
- Use `useLanguage()` and `tx(english, myanmar)` for interactive copy. Do not create a page-local language state that can disagree with the global switcher.
- `LanguageProvider` persists `a7-property-language` and updates the document `lang` attribute.

`docs/design-system.md` still contains an older Noto Sans Myanmar/Jade direction. For implemented typography and colors, `app/globals.css` overrides that legacy document. Do not remove the Noto fallback packages without verifying fallback glyph coverage.

## Device-local state contract

There are no device-local accounts: `AuthProvider` only restores a session from the API's HttpOnly refresh cookie, and without an API the viewer stays signed out. The journeys that remain device-local in both modes — recently viewed, saved searches, comparison selection, conversations and viewing requests in device mode, profile preferences, and CRM drafts — use the keys centralized in `lib/local-storage.ts`.

- Reuse `readStoredIds`, `writeStoredIds`, `readStoredJson`, and `writeStoredJson`.
- Do not access duplicate ad-hoc keys when a centralized key exists.
- Storage helpers intentionally fall back to in-memory state in restricted browsers.
- Preserve the `a7:stored-ids-change` and `a7:stored-json-change` events so separate client components synchronize without a global state library.

## UI, accessibility, and performance rules

- Design for 320 px and wider, with mobile as the primary journey.
- Interactive controls need visible focus and at least a 44×44 px touch target.
- Keep the root skip link, `#main-content`, one clear route H1, meaningful image alt text, dialog semantics, and reduced-motion behavior.
- Use both text/icon and color for verification or status; color alone is insufficient.
- Use `ProgressiveImage` for property imagery. Preload only the true first/LCP image; lazy-load repeated cards.
- Avoid full-page spinners where shaped skeletons or server-rendered content are available.
- Preserve transparent language: the assistant is rule-based, unavailable backend behavior must not look real, and device-mode forms that still store locally must say so.

## Testing and definition of done

For ordinary code changes, run at least:

```bash
npx tsc --noEmit
npm run lint
npm test
git diff --check
```

`npm test` first creates the vinext production build and then runs `tests/*.test.mjs`. Rendered HTML tests rely on that fresh `dist/` build. Add a focused regression test when fixing navigation, auth return paths, language/font behavior, catalog bundle boundaries, accessibility structure, API-mode honesty, or any previously observed bug.

On Windows the `npm test` and `npm run build:cloudflare` scripts use a POSIX `VAR=value command` prefix that `cmd.exe` cannot run. Run the command directly instead, for example `WRANGLER_LOG_PATH=.wrangler/wrangler.log npx vinext build` from a POSIX shell, then `node --test tests/*.test.mjs`.

For backend changes, run from `backend/`:

```bash
npx tsc --noEmit
npm test          # unit tests, no database
npm run test:e2e  # integration tests; DATABASE_URL must point at a disposable database
npm run build     # must emit dist/main.js, not dist/src/main.js
```

`npm run test:e2e` truncates every table between tests, so never point it at a database with real data. `tsconfig.build.json` deliberately compiles only `src/**`: adding anything outside it moves the inferred root and breaks `node dist/main.js`.

A frontend change is done only when:

1. Mobile and desktop flows remain coherent.
2. English/Myanmar state stays synchronized.
3. Demo claims remain truthful, and server-mode claims match what the backend actually does.
4. Type check, lint, production build, and tests pass.
5. No unrelated user changes are overwritten.
6. Deployable changes are published when the user requested a live update.

A backend change is done only when the type check, unit tests, integration tests and production build pass, the Prisma schema and `prisma/migrations` agree (`prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code`, which needs `SHADOW_DATABASE_URL`), and `npm ci` still succeeds against the committed lockfile — the production image builds with `npm ci`, so a drifted lockfile breaks the deploy.

## Sites hosting

This repository contains `.openai/hosting.json`, so use the installed Sites building and hosting skills for any deployment.

- Existing project ID: `appgprj_6a8ac269be0c8191b9683dd3e6893c73`
- Production URL: `https://a7-property-myanmar.ltunk36.chatgpt.site`
- Build with `npm run build:cloudflare`/`npm test`.
- Commit the exact validated source, push that commit to the Sites repository, package the successful build with the Sites `package-site.sh` helper, save a version, then deploy the saved version.
- Never expose or persist short-lived repository credentials or bypass tokens.
- Never change site access implicitly. Public access means anyone with the URL can visit and requires an explicit user approval after explaining that exposure.
- Treat Sites project/version/deployment IDs as opaque values; copy them exactly.

## Working safely

- Preserve the auto-generated Next.js block at the top of this file.
- The worktree may contain user changes. Inspect `git status` and relevant diffs before editing; do not reset or overwrite unrelated work.
- Prefer focused patches and existing primitives over parallel duplicate components.
- Consult `docs/frontend-architecture.md`, `docs/product-blueprint.md`, and `docs/a7-property-brand-system.md` for intent, but validate all claims against current source and tests because some documents describe earlier or aspirational milestones.
- Do not rename public property IDs, storage keys, the hosting project, or the production URL without an explicit migration request.
