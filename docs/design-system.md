# A7 Property Design System v1

**Status:** Frozen

**Freeze date:** 2026-08-24

**Implementation source of truth:** `app/globals.css` and source-owned primitives in `components/ui/`

This document records the visual rules already proven across A7 Property's public, seeker, owner, and agent journeys. Version 1 is a consistency contract, not a redesign brief. Product flows, information architecture, demo behavior, and layout hierarchy stay unchanged.

## 1. Brand principles

A7 Property is trustworthy, clear, premium without excess, and Myanmar-first. The interface should feel calm and useful before it feels decorative.

- Navy and cobalt communicate trust and action.
- Pale blue and cool white create depth without large decorative containers.
- Property photography remains the strongest content visual.
- 3D assets are selective landmarks, not the functional icon language.
- Status meaning always uses a label or icon in addition to color.

## 2. Semantic color and surface tokens

Use semantic tokens instead of introducing page-local pale colors.

| Role | Token | Value | Intended use |
|---|---|---:|---|
| Brand action | `--a7-blue` | `#123B73` | Primary CTA, selected text, strong links |
| Brand hover | `--brand-blue-hover` | `#0E2F5C` | Primary hover/pressed |
| Brand accent | `--a7-secondary` | `#4DA3FF` | Focus, small active cues, notification dots |
| App background | `--surface-app` | `#EAF4FF` | Default journey/workspace canvas |
| Section background | `--surface-section` | `#EEF5FF` | Grouped sections and quiet contrast |
| Surface | `--surface` | `#F8FBFF` | Cards, controls, navigation |
| Elevated surface | `--surface-elevated` | `#FFFFFF` | Menus, overlays, lifted controls |
| Muted surface | `--surface-muted` | `#E4EEFB` | Disabled and low-emphasis states |
| Selected surface | `--surface-selected` | `#DCEBFF` | Selected controls and active navigation |
| Border | `--border-subtle` | `#D0DEF0` | Default component border/divider |
| Strong border | `--border-strong` | `#B8CCE4` | Inputs and higher-definition separation |
| Primary text | `--text-primary` | `#101828` | Titles and body emphasis |
| Secondary text | `--text-secondary` | `#667085` | Supporting copy |
| Muted text | `--text-tertiary` | `#858C98` | Metadata and disabled copy |
| Success | `--status-success-*` | `#E7F4EC` / `#205C3B` | Active, verified, confirmed |
| Warning | `--status-warning-*` | `#FFF4E5` / `#8A4B0F` | Needs review, attention |
| Danger | `--status-danger-*` | `#FDECEC` / `#B42318` | Error, destructive action |

Dark navy is reserved for high-contrast actions, workspace navigation, and intentional trust moments. Do not place every section inside a pale-blue mega-card.

## 3. Typography

### English

- Display: `SF Pro Display`, then Apple/system sans fallbacks.
- Text: `SF Pro Text`, then Apple/system sans fallbacks.
- H1/H2/H3 use weight 600, compact negative tracking, and balanced wrapping.
- Body defaults to 16/24; supporting copy may use 13–14px when contrast and line height remain readable.
- Numeric content uses tabular lining numerals through `.type-number` or `data-type="number"`.

### Myanmar

- Required family: `Z06 Walone`.
- Asset: `public/fonts/z06-walone-bold.ttf`.
- The supplied face is declared only at weight 700; never fake a variable weight range.
- Myanmar UI uses zero letter spacing and taller heading/body line height.
- Compact 8–11px utilities are raised to a readable 12px-equivalent presentation by the global language rules.
- Interactive copy must use shared `useLanguage()` and `tx(english, myanmar)` state.
- Catalog titles, descriptions, amenities, township names, and owner names may remain English when the mock record has no localized field. This is a data-level localization gap, not a UI regression.

## 4. Header variants

Only three header categories are supported.

| Variant | Height | Use | Required behavior |
|---|---:|---|---|
| Public / Seeker | 64px mobile; 76px full desktop; 68px compact desktop | Home, search, saved, messages, profile, information pages | Brand, shared language state, notifications/account actions |
| Detail | 56px plus safe top inset | Property detail and focused subflows | Back action, one-line route title, compact account affordance |
| Workspace / CRM | 72px | Dashboard, owner, agent | Compact brand on narrow widths, role-aware actions, no public journey duplication |

All variants use `.a7-header-surface`:

- background `rgba(248, 251, 255, .88)`;
- border `rgba(16, 24, 40, .08)`;
- `--shadow-hairline`;
- 18px backdrop blur with restrained saturation;
- 44×44px minimum action targets;
- `.a7-safe-top` on public/detail mobile shells where the header height is content-driven.

Variant differences are structural and intentional. Do not force the detail back-header or CRM role controls into the public header.

## 5. Mobile bottom navigation

The global seeker navigation, seeker dashboard journey, and owner/agent workspace navigation share `.a7-mobile-nav-shell`.

- Height: 72px.
- Horizontal inset: 10px; maximum width 520px.
- Bottom inset: max of 10px and the device safe-area inset.
- Shell radius: 28px.
- Shell surface: cool-white 90% glass.
- Border: white at 82% opacity.
- Padding: 8px.
- Icon: 20px inactive, 22px active.
- Label: 10px English; Myanmar compact labels are promoted by the global typography rule.
- Item radius: 20px.
- Active state: pale cobalt glass pill, stronger icon/label, border, and soft shadow.
- Inactive state: `--text-secondary`; hover may add a very light white surface.

Four-item seeker-dashboard navigation and five-item public/CRM navigation are intentional information-architecture differences. Visual shell behavior must remain the same.

## 6. Icon and motion policy

### Functional interface icons

- Use Lucide for navigation, buttons, forms, status controls, search/filter, and utility actions.
- Standard functional sizes: 16px inline, 20px navigation/control, 22–24px emphasized active control.
- Stroke width normally stays between 1.9 and 2.3.

### Brand and external marks

- Iconify is allowed only for brand, social, or external-service marks where Lucide has no appropriate mark.
- It is not the default functional UI library.

### Custom A7 3D assets

Use transparent RGBA assets only for:

- hero or major journey anchors;
- empty/success/onboarding states;
- one selected brand moment in a section;
- verification or workspace identity when it materially aids scanning.

Do not use 3D assets for repeated toolbar actions, every settings row, every metric, or inside dense tables. Property photography and task controls must retain hierarchy. Entrance animation is a single restrained pop; hover may float/tilt. All transforms stop under `prefers-reduced-motion`.

## 7. Card visual DNA

Cards share the same family without forcing identical layouts.

- Base radius: `--radius-card` (20px).
- Default border: `--border-subtle`.
- Surface: `--surface`; elevated menus use `--surface-elevated`.
- Default depth: `--shadow-soft`.
- Internal spacing: 16px compact; 20–24px standard.
- Media, title, metadata, price, trust/status, and action zones should remain scannable in that order.
- Image-led property cards may use a larger feature radius when the media container owns the silhouette.
- Nested surface-on-surface treatment is allowed only when it expresses a real state or hierarchy. Avoid decorative wrappers around already complete cards.

## 8. Buttons

The source-owned `Button` supports five variants.

| Variant | Treatment | Use |
|---|---|---|
| Primary (`default`) | Navy fill, white text, action shadow | Main action per section |
| Secondary | Selected pale-blue fill, navy text | Lower-emphasis constructive action |
| Outline | Surface fill, visible border, navy text | Alternate action |
| Ghost | Transparent, hover surface | Toolbar and tertiary action |
| Destructive | Danger fill, white text | Confirmed removal/destructive action |

Controls have a 44px minimum target, 14px default radius, visible focus, restrained pressed scale, and stable disabled opacity. Icon-only controls require an accessible name.

## 9. Badges and status chips

`Badge` variants are `neutral`, `brand`, `success`, `warning`, `danger`, and `verified`.

- Height: at least 24px; pill shape.
- Use `brand` for selection/new informational states.
- Use `success` for active/confirmed/demo-success states.
- Use `warning` for review-needed states.
- Use `danger` only for error or blocked states.
- Use `verified` over imagery and always include the shield/check icon and text.
- Never express meaning through color alone.

## 10. Spacing, radius, and depth

### Spacing rhythm

Base unit is 4px. Preferred scale: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

- Mobile page gutter: 16px; 12px only for edge-constrained floating chrome.
- Desktop gutter: 32–40px.
- Card gap: 16–24px.
- Section rhythm: 40–64px mobile, 56–80px desktop according to content density.

### Radius tiers

- Compact: 8px.
- Small control: 12px.
- Standard control: 14px.
- Card/item: 20px.
- Sheet/feature shell: 28px.
- Pill: 999px.

Composite media silhouettes may interpolate within 20–28px, but shared primitives must not introduce arbitrary one-off radii.

### Shadow tiers

- Hairline: borders/navigation/header separation.
- Soft: standard cards.
- Lifted: floating navigation and emphasized hover.
- Overlay: modal, sheet, and popover.
- Action: primary CTA only.

Do not add unique page-local shadows when one of the five tiers communicates the same elevation.

## 11. Accessibility and responsive contract

- Support 320px and wider without horizontal page overflow.
- Preserve one route H1, `#main-content`, and the root skip link.
- Minimum touch target is 44×44px.
- Visible focus is mandatory for keyboard controls.
- Active and status states use shape/text/icon as well as color.
- Images use meaningful alt text when they communicate content.
- Motion respects `prefers-reduced-motion`.
- Myanmar glyphs may increase component height; never clip them to preserve an English-only height.

## 12. Localization ownership

UI copy and catalog data are audited separately.

- **UI localization bug:** a control, label, state, validation message, or route-owned heading fails to use the shared language state. Fix in the component.
- **Data localization gap:** a property record has only English title, address, amenities, description, owner, or activity text. Record it for future bilingual catalog fields; do not hide it with component-level hardcoded translations.

## 13. Freeze policy

Design System v1 is frozen after the required type, lint, production, browser, and screenshot checks pass.

- New shared colors, radii, shadows, header shells, bottom-nav shells, icon libraries, or button/badge variants require an explicit design-system review.
- Route-specific composition may vary when task hierarchy requires it, but it must use the semantic tokens and primitives above.
- A local exception must state its semantic reason in code or documentation; visual novelty is not a reason.
- Future work should fix product behavior or data quality without silently restyling the frozen shell.
