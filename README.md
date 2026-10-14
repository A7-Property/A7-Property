# A7 Property — Myanmar Property Marketplace

A7 Property is a mobile-first, bilingual property marketplace frontend for Myanmar. It helps property seekers discover homes to rent or buy, compare listings, save favorites, contact owners, and arrange viewings. It also includes device-local seeker, owner, and agent demo journeys.

**Production site:** [a7-property-myanmar.ltunk36.chatgpt.site](https://a7-property-myanmar.ltunk36.chatgpt.site)

## Project status

The deployed Next.js interface is still a **frontend demo**. A separate NestJS/PostgreSQL backend foundation now exists in [`backend/`](backend/README.md), but the UI is not connected to it or deployed as a live platform.

- Authentication is simulated and stored in the browser.
- Saved homes, comparisons, conversations, viewing requests, preferences, and CRM drafts are device-local.
- Social sign-in buttons do not contact external OAuth providers.
- The property assistant uses deterministic parsing and ranking; it is not a live AI service.
- Drizzle/D1 files are future-facing groundwork; no database binding is active.
- There is no bundled mock property catalog. Listings come from the NestJS API when `NEXT_PUBLIC_API_URL` is set; without it the marketplace is honestly empty.
- Listing and contact verification labels reflect each record's actual status.

The interface communicates these limitations so simulated actions are not presented as live services.

## Main experiences

### Discovery and search

- Rent and buy intent switching
- Yangon and Mandalay location discovery
- Real listings from the API with MMK pricing; an empty marketplace renders an honest empty state
- URL-driven purpose, location, type, price, room, furniture, and parking filters
- Recommended, newest, and price sorting
- List and map views using Leaflet and OpenStreetMap
- Progressive property imagery for lower-bandwidth connections

### Property details and inquiries

- Server-resolved property detail routes and metadata
- Image galleries, facts, descriptions, amenities, and nearby places
- Honest listing and contact verification states
- Device-local messages and viewing requests
- Favorite, share, and comparison actions

### Saved homes and comparison

- Favorites synchronized across client components
- Recently viewed property history
- Side-by-side comparison for up to four homes
- Persistent comparison tray

### Account journeys

- Seeker and lister role selection
- Protected demo routes with return-to-page behavior
- Seeker dashboard, saved homes, messages, viewing activity, and profile preferences
- Owner and agent CRM demos with listing drafts, leads, viewing status, metrics, verification, and settings

### Language and visual system

- Shared English/Myanmar language state
- Myanmar digit and MMK amount formatting
- User-supplied **Z06 Walone Bold** font for Myanmar UI text
- Language preference persisted across navigation and browser tabs
- Custom transparent 3D icon family for major journeys and section anchors
- Shared Framer Motion animation with reduced-motion support
- Consistent A7 cobalt-blue, warm-white, pale-blue, and mint palette
- Frozen [A7 Property Design System v1](docs/design-system.md) for headers, navigation, surfaces, typography, icons, cards, buttons, badges, spacing, radii, and depth

## Routes

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Home discovery |
| `/search` | Public | Property filters, results, and map |
| `/properties/[id]` | Public | Property details and inquiry entry |
| `/compare` | Public | Device-local comparison |
| `/assistant` | Public | Rule-based property matching demo |
| `/community` | Public | Community information |
| `/help` | Public | Help and safety information |
| `/privacy` | Public | Privacy policy |
| `/terms` | Public | Terms of service |
| `/sign-in` | Public | Seeker/lister demo sign-in |
| `/dashboard` | Seeker | Seeker overview and activity |
| `/saved` | Seeker | Saved homes journey |
| `/owner` | Lister | Owner CRM demo |
| `/agent` | Lister | Agent workspace demo |
| `/messages` | Signed-in | Device-local conversations |
| `/profile` | Signed-in | Profile and preferences |

## Technology

| Area | Technology |
|---|---|
| Framework | Next.js 16 App Router + vinext |
| UI runtime | React 19 + strict TypeScript |
| Styling | Tailwind CSS 4 + source-owned UI primitives |
| Interaction | Base UI + Framer Motion |
| Maps | Leaflet + React Leaflet + OpenStreetMap |
| Icons | Lucide React + Iconify + custom 3D RGBA assets |
| Forms | React Hook Form + Zod |
| Hosting | OpenAI Sites / Cloudflare-compatible vinext build |
| Mobile wrapper | Capacitor Android |
| New backend foundation | NestJS + PostgreSQL + Prisma + JWT (not connected to the UI) |
| Legacy future-facing files | Drizzle ORM + SQLite/D1-compatible schema (inactive) |
| Myanmar typography | Z06 Walone Bold + Noto Sans Myanmar fallback |

## Requirements

- Node.js 22.x
- npm

No environment variables are required for the frontend demo. `NEXT_PUBLIC_SITE_URL` can optionally override the canonical production URL used in metadata.

## Local development

Install dependencies:

```bash
npm install
```

Start the standard Next.js development server:

```bash
npm run dev:next
```

Open [http://localhost:3000](http://localhost:3000).

For Cloudflare/vinext-compatible development, use:

```bash
npm run dev
```

Run only one development server at a time because both use the same default port.

## Commands

| Command | Description |
|---|---|
| `npm run dev:next` | Start the Next.js local server |
| `npm run dev` | Start vinext development mode |
| `npm run build` | Build with Next.js/Webpack |
| `npm run build:cloudflare` | Build the Sites artifact into `dist/` |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Run the strict TypeScript check |
| `npm test` | Build the production artifact and run regression tests |
| `npm run test:browser` | Run the mobile Chromium regression suite |
| `npm run db:generate` | Generate future-facing Drizzle migrations |
| `npm run android:sync` | Build and synchronize the Capacitor Android wrapper |
| `npm run android:apk` | Build the Android debug APK |

Do not edit generated `.next/`, `dist/`, `out/`, or Android build output manually.

## Architecture

```text
app/                         Route entries, metadata, providers, sitemap
components/
  assistant/                 Rule-based property matching
  auth/                      Browser-local identity and route guards
  compare/                   Comparison page and global tray
  dashboard/                 Seeker dashboard and lister CRM
  i18n/                      Shared language provider and switcher
  layout/                    Headers, navigation, and shells
  mobile/                    Primary mobile journeys
  property/                  Cards, galleries, maps, details, inquiries
  search/                    Filters, results, sorting, and map controls
  ui/                        Reusable source-owned UI primitives
docs/                       Product, architecture, brand, and design notes
hooks/                       Shared client hooks
lib/properties.ts            Client-safe types, formatters, filters, sorting
lib/property-source.ts       Server-side listing reads from the API
lib/local-storage.ts         Resilient browser persistence and sync events
public/fonts/                Z06 Walone Myanmar font asset
public/icons/                Transparent A7 3D visual assets
tests/                       Source, rendered-output, and browser regressions
```

Routes select property data on the server where practical and pass only the records required by interactive client components. The full catalog is kept separate from client-safe helpers so search and global UI do not regain a large catalog bundle.

The root providers are intentionally composed in this order:

```text
LanguageProvider
  AuthProvider
    ToastProvider
      route content
      ComparisonTray
      MobileBottomNav
```

## Device-local state

Browser state is centralized through `lib/local-storage.ts`. It covers:

- Saved and recently viewed homes
- Comparison IDs and saved searches
- Conversations and viewing requests
- Profile and notification preferences
- CRM listing drafts

Storage helpers include an in-memory fallback for embedded or privacy-restricted browsers and dispatch synchronization events for separate client components.

## Accessibility and responsive behavior

- Mobile-first layouts support widths from 320 px upward.
- Interactive controls target at least 44×44 px.
- Keyboard focus remains visible.
- Routes preserve a skip link, a main landmark, and one clear H1.
- Images use meaningful alternative text where they communicate content.
- Status and verification information use text and icons instead of color alone.
- Motion components respect the operating system's reduced-motion preference.

## Myanmar typography

The active Myanmar typography contract lives in `app/globals.css`:

- Asset: `public/fonts/z06-walone-bold.ttf`
- Family: `Z06 Walone`
- Declared weight: `700`
- Fallback: Noto Sans Myanmar

When the shared language changes to Myanmar, the document language and typography variables switch together. Myanmar text receives additional line height and readable sizes for compact labels.

## Validation

Run the complete validation before publishing:

```bash
npx tsc --noEmit
npm run lint
npm test
git diff --check
```

`npm test` first creates a vinext production build and then runs all `tests/*.test.mjs` regression tests. The suite covers route rendering, accessibility structure, property data integrity, verification truthfulness, Myanmar typography, auth behavior, mobile navigation, 3D icon alpha channels, and catalog bundle boundaries.

## Android

The Capacitor wrapper uses app ID `com.a7property.app` and the generated `out/` directory.

```bash
npm run android:sync
npm run android:apk
```

The Android app wraps the same frontend demo and does not add a backend.

## Deployment

The repository is linked to an existing OpenAI Sites project through `.openai/hosting.json`. Production releases use the Cloudflare-compatible vinext artifact.

Before a release:

1. Run type checking, linting, and the complete test suite.
2. Commit the exact validated source.
3. Push that commit to the linked Sites source repository.
4. Package and save the validated `dist/` artifact.
5. Deploy the saved Sites version.

Changing site access is separate from deployment. Public access requires explicit project-owner approval.

## Documentation

- [`AGENTS.md`](./AGENTS.md) — mandatory repository guidance for coding agents
- [`docs/frontend-architecture.md`](./docs/frontend-architecture.md) — route and component architecture
- [`docs/product-blueprint.md`](./docs/product-blueprint.md) — product vision, personas, and journeys
- [`docs/a7-property-brand-system.md`](./docs/a7-property-brand-system.md) — current brand direction
- [`docs/design-system.md`](./docs/design-system.md) — earlier design notes; `app/globals.css` is authoritative for implemented colors and typography

## License

Private project. All rights reserved.
