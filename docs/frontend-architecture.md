# A7 Property Production Frontend Architecture

This document is the implementation contract for the next product milestone. It is intentionally written before the route code so each page starts with an explicit component tree, file boundary, data flow, and state model.

## Shared foundation

### Component structure

- `AppHeader`: shared desktop/mobile navigation and contextual search entry point.
- `PropertyCard`: normalized property summary for grids, recommendations, saved homes, and recent views.
- `PropertyMap`: accessible visual map surface with selectable property markers.
- `FilterPanel`: controlled filter form shared by desktop sidebar and mobile bottom sheet.
- `Sheet`: focus-friendly mobile/desktop overlay foundation.
- `DashboardShell`: responsive SaaS sidebar, header, and mobile navigation.
- `MetricCard`, `StatusBadge`, and small chart components: dashboard primitives.

### File structure

- `components/layout/*` — navigation and page shells.
- `components/property/*` — cards, maps, details, galleries, inquiry controls.
- `components/search/*` — filters, sorting, result summaries, and mobile sheet.
- `components/dashboard/*` — user and CRM dashboard modules.
- `components/assistant/*` — chat and recommendation presentation.
- `components/ui/*` — shadcn-style source-owned primitives.
- `lib/properties.ts` — property types, normalized selectors, price formatting, and filters.

### Data flow

The API is the single listing source (no bundled catalog). Server routes select records for SEO; client views receive serializable data and own interactive presentation.

### State management

Use local component state for ephemeral UI, URL search parameters for shareable search intent, and local storage only for device-local favorites/recent views. No speculative global store is introduced.

## 1. Property search — `/search`

### Component structure

`SearchPage` → `AppHeader` → `SearchToolbar` → desktop `FilterPanel` + `SearchResults` → optional `PropertyMap`. Mobile uses the same `FilterPanel` inside `Sheet`; applied filters appear as removable chips. `PropertyCard` handles every result.

### File structure

- `app/search/page.tsx` — SEO metadata and route entry.
- `components/search/property-search.tsx` — client search controller.
- `components/search/filter-panel.tsx` — controlled filter fields.
- `components/search/search-toolbar.tsx` — result count, sorting, map toggle.
- `components/property/property-map.tsx` — map and marker selection.

### Data flow

The route passes the listing dataset into the client controller. Initial `purpose`, `location`, and sort values come from URL search parameters when present. A pure `filterProperties()` selector returns results; selection flows from card/marker into one shared selected-property ID.

### State management

- Search filters: one typed state object.
- Sorting and map/list mode: local state, reflected in the URL when search is applied.
- Mobile sheet: open/closed state plus a draft filter object, committed only on Apply.
- Favorites: existing device-local favorite storage.

## 2. Property detail — `/properties/[id]`

### Component structure

Server route → `PropertyDetailView` → `AppHeader`, `PropertyGallery`, title/price/trust header, `PropertyFacts`, description, amenities, `PropertyMap`, nearby places, `OwnerCard`, and `InquiryBar`. Contact and viewing actions open focused `Sheet` flows.

### File structure

- `app/properties/[id]/page.tsx` — record lookup, metadata, and static params.
- `components/property/property-detail-view.tsx` — detail composition and inquiry state.
- `components/property/property-gallery.tsx` — responsive gallery/lightbox.
- `components/property/owner-card.tsx` — verified contact summary.
- `components/property/inquiry-sheet.tsx` — contact and scheduling forms.

### Data flow

The server route resolves the property ID and returns a not-found response for unknown records. Metadata is generated from the property title, price, location, and first image. The client detail view receives the record and its owner information from the API.

### State management

- Gallery index and lightbox: local state.
- Favorite and recently viewed: device-local storage.
- Inquiry mode, message, and appointment fields: local controlled form state.
- Submission confirmation: local state pending future Supabase mutation.

## 3. User dashboard — `/dashboard`

### Component structure

`DashboardShell` → profile greeting and profile-completeness card → summary metrics → saved property rail → recently viewed rail → messages list → upcoming appointment timeline.

### File structure

- `app/dashboard/page.tsx` — route metadata and dashboard entry.
- `components/dashboard/dashboard-shell.tsx` — responsive navigation shell.
- `components/dashboard/user-dashboard.tsx` — user overview composition.

### Data flow

Account data enters the client dashboard as serializable props. Saved and recently viewed listing IDs resolve through shared property selectors. Future authentication can replace only the route loader.

### State management

Navigation section and message selection are local. Saved property interactions reuse device-local favorites. No account mutation is simulated.

## 4. Owner CRM — `/owner`

### Component structure

`DashboardShell` → owner identity/verification → metric cards (25 properties, 15,000 views, 250 messages) → performance chart → listing table/cards → lead inbox → verification checklist. `ListingEditorSheet` handles creation and edits with photo-upload affordances, price, status, and core facts.

### File structure

- `app/owner/page.tsx` — owner route entry.
- `components/dashboard/property-crm.tsx` — role-aware CRM composition.
- `components/dashboard/listing-editor-sheet.tsx` — controlled listing form.

### Data flow

The route provides owner identity and scoped listing records. Dashboard modules derive totals and performance summaries. The editor emits a typed draft back to the CRM controller; frontend-only success feedback is shown until Supabase mutations are connected.

### State management

Active CRM section, editor mode, selected listing, and typed draft use local state. Table sorting is derived state. Photo previews use local object-free placeholders to avoid temporary upload code.

## 5. Agent CRM — `/agent`

### Component structure

The agent route reuses `PropertyCRM` with agent-specific identity, portfolio scale, lead assignments, response metrics, and team context. The interaction model is intentionally consistent with the owner product.

### File structure

- `app/agent/page.tsx` — agent route entry and role configuration.
- Shared CRM files listed above.

### Data flow

Agent fixtures and assigned listing records enter through a role configuration object. Shared components render role-relevant labels and metrics without branching the underlying data model.

### State management

Same controller as owner CRM, plus a local assignee filter for lead management.

## 6. AI home consultant — `/assistant`

### Component structure

`AssistantPage` → consultant profile → `ChatThread` → composer → structured understanding chips (location, budget, bedrooms) → `RecommendationGrid` → comparison table. Loading uses a calm three-dot shimmer and explicit “finding verified matches” status.

### File structure

- `app/assistant/page.tsx` — route metadata and entry.
- `components/assistant/property-consultant.tsx` — conversation controller.
- `components/assistant/recommendation-card.tsx` — reason-led result card.
- `lib/property-assistant.ts` — deterministic query parsing and ranking.

### Data flow

User text passes to a pure parser that extracts township, MMK budget, purpose, and room requirements. The parsed intent feeds the same shared listing selectors, then a ranking function returns properties with human-readable reasons. A future AI endpoint can replace this adapter without changing the interface.

### State management

Conversation messages, current input, loading status, parsed intent, recommendation IDs, and comparison selection are local to the consultant controller. Comparison is capped at three homes for clarity.

## Accessibility and SEO contract

- Every route has unique metadata and one clear H1.
- Interactive icons have accessible names and 44px touch targets.
- Sheets use dialog semantics, close controls, backdrop dismissal, and Escape handling.
- Search and form status changes use polite live regions.
- Map markers are keyboard-operable and mirrored by a textual result list.
- Motion respects the existing reduced-motion stylesheet.
- Detail routes expose descriptive image alt text and location/price content in server-rendered HTML.
