# A7 Property UI/UX Research Brief for Hermes

Version: 1.0
Updated: 2026-08-06
Product: A7 Property — Myanmar Real Estate Marketplace

## 1. Why this document exists

This document explains the current A7 Property product, visual system, screen hierarchy, and interaction principles to a research or design agent named **Hermes**.

Hermes should use it to:

1. Find high-quality real estate products with patterns relevant to A7 Property.
2. Find specific screen and component references—not generic mood boards.
3. Explain why each reference fits A7.
4. Recommend patterns that can be adapted without copying another brand.
5. Find reusable React/TypeScript implementation references when licensing permits.

The task is **not** to redesign A7 into another Zillow, Airbnb, or SaaS dashboard. The task is to identify proven ideas that can make A7 clearer, more trustworthy, and more premium for Myanmar users.

## 2. Product definition

A7 Property is a bilingual, Myanmar-first marketplace for people who want to:

- Rent or buy a home.
- Compare verified properties.
- Save homes and searches.
- Message verified owners or agents.
- Schedule a viewing.
- Receive light assistance from A7 AI.
- List and manage properties as an owner or agent.

Core promise:

> Finding a home should feel simple, trusted, and personal.

The emotional outcome should be:

> “I can quickly understand this property, trust the information, and confidently take the next step.”

## 3. Product personality

A7 should feel:

- Calm
- Premium
- Trustworthy
- Human
- Local
- Modern
- Property-first

A7 should not feel:

- Like an AI-generated interface
- Like a SaaS analytics dashboard
- Like a crypto or gaming product
- Like a generic chat application
- Visually noisy or over-decorated
- Dependent on gradients, glass, or blue surfaces everywhere

## 4. Inspiration model

Use these products as directional references, not templates to copy:

| Product quality | Directional reference | What A7 needs from it |
|---|---|---|
| Search efficiency | Zillow / Redfin | Fast location search, useful filters, list-map relationship |
| Discovery emotion | Airbnb | Strong photography, calm browsing, human confidence |
| Interface restraint | Apple HIG | Typography, spacing, touch behavior, motion discipline |
| Asian usability | PropertyGuru / 99.co / DDproperty | Dense local information without dashboard clutter |
| Marketplace trust | Realtor.com / Rightmove / Zoopla | Clear facts, verification, location, agent context |

Hermes must also research products outside this list when they provide a better pattern.

## 5. Fixed A7 brand system

Hermes must not propose replacing these three brand anchors.

| Token | Value | Primary use |
|---|---|---|
| A7 Primary Blue | `#0057D9` | Primary actions, active states, links, verification |
| A7 Light Cream | `#FAF8F5` | Main application canvas |
| A7 Dark Navy | `#0F1B2D` | Primary text, premium dark areas, strong contrast |

Supporting colors:

| Token | Value | Use |
|---|---|---|
| Surface | `#FFFFFF` | Sheets, cards, inputs |
| Secondary text | `#667085` | Captions and supporting copy |
| Soft blue | `#EDF4FF` | Selected backgrounds and subtle emphasis |
| Border subtle | `#E5E2DD` | Dividers, controls, card borders |
| Success | `#287A4B` | Confirmed or successful states only |

Color rules:

- Blue is an action and trust color, not a page background.
- Cream should remain the dominant canvas.
- Navy should carry most text hierarchy.
- White surfaces should create clarity, not a card for every paragraph.
- Use gradients only when image legibility requires an overlay.
- Green must never replace A7 Blue as the main theme.

## 6. Typography

English:

- Display: SF Pro Display-style system stack.
- UI and body: SF Pro Text-style system stack.
- Fallbacks: `-apple-system`, `BlinkMacSystemFont`, `Helvetica Neue`, sans-serif.

Myanmar:

- Primary: Noto Sans Myanmar.
- Myanmar headings need a taller line height and no negative letter spacing.

Hierarchy:

| Role | Typical size | Weight | Notes |
|---|---:|---:|---|
| Hero | 42–64px | 700 | Only for the main discovery statement |
| Page title | 32–46px | 600 | One clear title per page |
| Section title | 22–28px | 600 | Short, descriptive, property-focused |
| Card title | 15–18px | 600 | Maximum two lines |
| Body | 14–16px | 400 | Comfortable reading |
| UI label | 10–12px | 500–600 | Do not shrink below legibility |
| Caption | 9–11px | 400–500 | Metadata only |

Numbers and prices use tabular lining figures when possible.

## 7. Spacing, radius, shadow, and material

Spacing follows a 4/8 rhythm:

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64`

Radius:

| Element | Radius |
|---|---:|
| Small utility | 8px |
| Input and button | 14px |
| Property card | 20px |
| Bottom sheet | 28px |
| Pill and segmented control | 999px |

Shadow:

- Hairline: controls and segmented states.
- Soft: ordinary property cards.
- Lifted: sticky search and important overlays.
- Overlay: modal and bottom sheet only.
- Avoid heavy shadows on every element.

Glass material:

- Allowed on sticky headers, bottom navigation, or an image overlay action.
- Use white at roughly 80–90% opacity with restrained blur.
- Never stack multiple glass panels in one area.
- Content cards should normally remain opaque white.

## 8. Motion rules

Current motion timing:

- Fast: 160ms
- Base: 220ms
- Slow: 320ms
- Standard easing: `[0.22, 1, 0.36, 1]`
- Spring: stiffness 320, damping 30, mass 0.82

Allowed:

- Fade and move upward by 8–14px.
- Sheet slide from bottom.
- Active segmented-control indicator.
- Heart save scale feedback.
- Image fade/clarify after loading.
- Gentle hero parallax.

Avoid:

- Bouncing cards.
- Continuous decorative motion.
- Large blur animation.
- Neon glow.
- Long transitions over 400ms for routine actions.
- Animation that delays search or contact actions.

All motion must respect reduced-motion preferences.

## 9. Mobile navigation

The main mobile navigation has five tabs:

1. Home
2. Search
3. Saved
4. Messages
5. Profile

Rules:

- Fixed at the bottom with safe-area support.
- Minimum 44px touch targets.
- Active tab uses A7 Blue and a soft-blue pill indicator.
- Inactive tabs use neutral gray.
- Hide this navigation on focused property detail and owner/agent workspaces when it would compete with primary actions.

## 10. Current screen architecture

### 10.1 Home discovery

Information order:

1. Compact brand header, language, messages, profile.
2. Large editorial property hero.
3. Personal greeting and location context.
4. Primary search field with Rent/Buy intent.
5. Popular locations carousel.
6. “Homes worth seeing” recommendations.
7. Recently viewed homes.
8. Subtle A7 Assistant prompt.
9. Mobile bottom navigation.

Responsive behavior:

- Small screens use horizontal swipe discovery.
- Recommendation cards remain a horizontal carousel below 768px.
- At 768px and above, three recommendations form one equal grid row.
- Do not allow an orphan third card to leave half of a tablet row empty.

Research targets for Hermes:

- Premium home-feed openings.
- Search within an editorial hero.
- Popular-location cards.
- Recommendation carousels with excellent image hierarchy.
- Recently viewed patterns that do not feel like a dashboard.

### 10.2 Search and filters

Header:

- Back action.
- Compact pill search input.
- Circular blue search action.
- Separate filter action with active-filter count.
- No permanent row of Location/Price/Beds/Home Type chips.

Filter sheet:

- Inset, rounded mobile sheet.
- Top drag handle, Filters title, close action.
- For Sale / For Rent / For Buy segmented purpose.
- City and Country selectors.
- Property category pills.
- Interactive minimum/maximum price range.
- Bedrooms and Bathrooms selectors.
- One full-width Apply Filters action at the bottom.

Results:

- Result count and clear page title.
- Sort and List/Map switch.
- Active filters appear only when a filter is actually applied.
- Property image is the most prominent card element.
- Desktop can use sidebar + map; mobile uses bottom sheet + list/map switch.

Research targets for Hermes:

- Mobile property filter sheets.
- List/map transitions.
- Location autocomplete patterns.
- Price range controls for currencies with large numeric ranges.
- Filter summaries that do not create a crowded chip toolbar.

### 10.3 Property card

Default hierarchy:

1. 16:10 real property image.
2. Verified property label.
3. Favorite action.
4. Location overlay.
5. Rent/Sale status.
6. Property title, maximum two lines.
7. Price and period.
8. Rating.
9. Beds, baths, area.

Rules:

- Real photography first; no generated-looking houses.
- Natural light and realistic Myanmar context.
- No watermarks.
- Avoid duplicated location/type text.
- Save action must not interfere with opening the property.
- Use compact horizontal cards only where space or journey context requires them.

### 10.4 Property detail

Information order:

1. Sticky back, favorite, and share header.
2. Swipeable image gallery with counter and verified label.
3. Property title, township/city, rating, and verification context.
4. Price and availability.
5. Beds, baths, and area facts.
6. A7 Verified Home trust block.
7. About this home.
8. Amenities.
9. Location preview without exposing a private exact address.
10. Nearby school, hospital, market, and transit context.
11. Verified owner/agent card.
12. Subtle “Ask A7 about this home.”
13. Similar properties.
14. Sticky Message and Schedule actions.

Research targets for Hermes:

- Best-in-class mobile gallery behavior.
- Trust and verification patterns.
- Price/fact hierarchy.
- Owner/agent contact modules.
- Sticky dual CTAs.
- Privacy-aware map treatments.

### 10.5 Saved journey

The Saved experience should combine:

- Saved homes.
- Recently viewed homes.
- Saved searches and alerts.
- Compare selection when useful.

It must feel like a continuing home journey, not a collection-management dashboard.

### 10.6 Messages

Messages are property-first, not avatar-first.

Conversation card hierarchy:

1. Property thumbnail.
2. Property title and location.
3. Owner or agent name.
4. Verified role.
5. Last-message preview.
6. Timestamp and unread state.

Page structure:

- Messages title and active count.
- Conversations/Viewings segmented control.
- Recent homes: “Continue your home journey.”
- Property-linked conversation list.
- Conversation thread with property context always visible.
- Private-conversation trust cue.

Research targets for Hermes:

- Airbnb host/guest messaging.
- Real-estate inquiry threads.
- Property-attached chat headers.
- Mobile conversation lists with rich listing context.

Do not return generic WhatsApp or Messenger clones without property context.

### 10.7 Profile

Profile is personal, not analytical.

Information order:

1. Avatar, name, city, and verification.
2. Edit profile.
3. Home preferences.
4. Saved-home count and relevant journey shortcuts.
5. Notifications, language, privacy, and help.

Do not turn the seeker profile into an admin dashboard.

### 10.8 A7 Assistant

AI is a helper, not the product identity.

Good uses:

- Natural-language search.
- Explainable match percentage.
- “Why this matches” reasons.
- Compare similar homes.
- Explain whether a price appears reasonable.

UI rules:

- Small “Ask A7” entry point.
- No robot mascot dominating the page.
- No neon gradient or AI dashboard shell.
- Recommendations must lead back to real property cards.

### 10.9 Owner, agent, and admin tools

These workspaces may use denser layouts because their tasks differ from consumer discovery.

Owner/agent priorities:

- Listings and draft status.
- Leads and inquiries.
- Viewing schedule.
- Verification.
- Clear performance summaries.

Admin priorities:

- Moderation.
- Property and identity verification.
- Reports and safety.
- Marketplace health.

Do not reuse CRM/dashboard density in the consumer Home, Search, Messages, or Profile pages.

## 11. Myanmar-specific UX requirements

Hermes must evaluate every inspiration pattern for local suitability.

- English and Myanmar UI must both fit without truncation.
- English price example: `1,500,000 MMK`.
- Myanmar price example: `၁၅ သိန်း`.
- Township is often more useful than a street address.
- Exact private residential addresses should not be exposed before appropriate contact.
- Verification must cover property information and owner/agent identity.
- Contact options may include in-app messaging plus Viber, Messenger, or Telegram where appropriate.
- Low-bandwidth image loading and clear skeleton states matter.
- Touch behavior must work well on common mid-range Android devices.

## 12. Component architecture Hermes should respect

Core reusable components:

- `Button`
- `Card`
- `Badge` / verification pill
- `Avatar`
- `SearchBar`
- `PropertyCard`
- `ProgressiveImage`
- `SegmentedControl`
- `FilterSheet`
- `BottomSheet`
- `Modal`
- `PropertyGallery`
- `PropertyMap`
- `OwnerCard`
- `Message`
- `BottomActionBar`
- `MobileBottomNav`

Component requirements:

- Reusable and typed.
- Keyboard accessible.
- Screen-reader labels on icon-only buttons.
- 44px minimum touch targets.
- Reduced-motion support.
- Loading, empty, selected, error, and disabled states.
- Responsive without page-specific hacks.

## 13. Current technology constraints

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- Lucide and Iconify icons
- Leaflet / OpenStreetMap
- shadcn-compatible component patterns
- Cloudflare-compatible deployment via vinext

Hermes may recommend a component or source reference only when it can be adapted cleanly to this stack.

Avoid recommending a full framework replacement merely because a demo looks attractive.

## 14. Hermes research assignment

### Goal

Find the strongest current mobile and responsive references for A7 Property’s consumer experience, then identify practical ideas A7 can adapt.

### Required research areas

Hermes must research all of these:

1. Home discovery feed.
2. Search header and autocomplete.
3. Mobile filter sheet.
4. Property result card.
5. List/map view.
6. Property detail and gallery.
7. Verification and trust.
8. Saved-home journey.
9. Property-first messages.
10. Personal seeker profile.
11. Subtle AI assistance.
12. Owner/agent lead management.

### Source quality order

Prefer:

1. Shipped mobile apps and responsive production websites.
2. Official product documentation and design systems.
3. High-quality case studies showing real flows.
4. Open-source implementations with clear licenses.
5. Figma Community examples only when they show a complete, coherent flow.

Avoid using Dribbble shots as primary evidence. A pretty isolated card without a real flow is weak research.

### Suggested search queries

- premium real estate mobile app search filter UX
- property marketplace mobile list map UX
- Zillow mobile search filter sheet
- Airbnb listing detail mobile information hierarchy
- PropertyGuru mobile property search UX
- 99.co property card mobile UX
- real estate verified listing trust UX
- property inquiry messaging UX
- saved homes mobile journey UX
- React Tailwind real estate property card open source
- accessible dual range price filter React TypeScript
- mobile bottom sheet filter Framer Motion

## 15. Required Hermes output

Hermes must return one Markdown report with the following structure.

### A. Executive recommendation

- Five most important improvements for A7.
- Why each improvement matters.
- Which screen it affects.

### B. Reference matrix

Return at least 15 useful references.

| Reference | Platform | Screen/pattern | Why it matches A7 | Adapt | Avoid | Source URL |
|---|---|---|---|---|---|---|

Every reference must have a working source URL. Do not provide only product names.

### C. Pattern analysis by A7 screen

For each required research area, include:

- Best reference.
- Screenshot or direct screen link when available.
- Information hierarchy.
- Interaction behavior.
- What A7 should adapt.
- What would not work for Myanmar users.

### D. Component/code references

For every code source include:

| Component | Repository/package | Framework | License | Why useful | Integration risk | URL |
|---|---|---|---|---|---|---|

Do not recommend copying code without confirming its license.

### E. A7 gap analysis

Use this format:

| Current A7 pattern | Evidence from reference | Problem/opportunity | Recommended change | Priority |
|---|---|---|---|---|

Priority must be `P0`, `P1`, or `P2`.

### F. Final direction

Recommend one cohesive direction, not a collage of unrelated trends.

The direction must preserve:

- A7 Blue, Cream, and Navy.
- Property-first photography.
- Myanmar localization.
- Verification and trust.
- Mobile-first thumb usability.
- Calm Apple/Airbnb restraint.
- Zillow-level search clarity.

## 16. Evaluation scorecard

Score each major reference from 1–5.

| Criterion | Question |
|---|---|
| Search speed | Can a user find a relevant home with few steps? |
| Scan clarity | Can price, location, and facts be understood immediately? |
| Trust | Are verification, owner, and property status credible? |
| Mobile ergonomics | Are primary actions thumb-friendly and at least 44px? |
| Visual restraint | Does it avoid excessive cards, color, and effects? |
| Localization fit | Can it support Myanmar language, prices, and townships? |
| Performance | Can the pattern remain fast on mid-range devices? |
| Implementation fit | Can it work with React, Tailwind, and Framer Motion? |

Do not recommend a pattern with a low trust or localization score merely because it looks premium.

## 17. Non-negotiable “do not” list

Hermes must not recommend:

- Changing the three A7 brand colors.
- A generic SaaS dashboard for consumer pages.
- A robot-centered AI interface.
- Glassmorphism on every surface.
- Multiple gradients in one viewport.
- Tiny touch targets.
- Image-light property cards.
- Avatar-only conversation lists.
- Exact private address exposure.
- Animation that slows a property inquiry.
- Unlicensed component copying.
- Fake or obviously AI-generated property photography.

## 18. Copy-paste prompt for Hermes

```text
You are Hermes, acting as a senior product-design researcher for A7 Property, a Myanmar-first real estate marketplace.

Read this entire document before researching. Find current, high-quality mobile and responsive product references that can improve A7 Property without changing its fixed brand colors: A7 Blue #0057D9, Light Cream #FAF8F5, and Dark Navy #0F1B2D.

Research real shipped products first. Focus on home discovery, search, mobile filters, property cards, list/map UX, property details, verification, saved homes, property-first messaging, profile, subtle AI assistance, and owner/agent workflows.

Do not return generic inspiration, isolated Dribbble shots, AI dashboards, or a list of popular UI libraries. Explain the exact screen pattern, information hierarchy, interaction, why it fits A7, what should be adapted, and what should be avoided for Myanmar users.

Return:
1. Five executive recommendations.
2. At least 15 references with direct URLs.
3. Screen-by-screen pattern analysis.
4. Licensed React/TypeScript/Tailwind component references where available.
5. A P0/P1/P2 gap analysis against current A7.
6. One cohesive final design direction.

Evaluate every recommendation for trust, mobile ergonomics, Myanmar localization, performance, and implementation fit. Preserve A7’s property-first, calm, premium identity.
```

## 19. Definition of success

Hermes succeeds when the final report makes it easy for the A7 team to answer:

1. Which real products have the strongest relevant patterns?
2. Which exact parts should A7 adapt?
3. Why will those changes help Myanmar home seekers?
4. Which ideas should A7 avoid?
5. Which components can be implemented safely in the current stack?
6. What should be improved first?

The final design question remains:

> Can the user find and trust a home quickly?
