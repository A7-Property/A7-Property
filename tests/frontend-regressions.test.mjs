import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function source(pathname) {
  return readFile(new URL(`../${pathname}`, import.meta.url), "utf8");
}

test("mobile dashboard exposes only one bottom navigation", async () => {
  const [globalNav, dashboard] = await Promise.all([
    source("components/layout/mobile-bottom-nav.tsx"),
    source("components/dashboard/user-dashboard.tsx"),
  ]);

  assert.match(globalNav, /pathname\.startsWith\("\/dashboard"\)/);
  assert.equal((dashboard.match(/Mobile home journey/g) ?? []).length, 1);
});

test("Myanmar font mapping reflects the supplied bold face and keeps compact copy readable", async () => {
  const css = await source("app/globals.css");

  assert.match(css, /font-family:\s*"Z06 Walone"[\s\S]*?font-weight:\s*700;/);
  assert.doesNotMatch(css, /font-weight:\s*400 900;/);
  assert.match(css, /html\[lang="my"\][\s\S]*?text-\[10px\][\s\S]*?font-size:\s*0\.75rem !important;/);
});

test("client-safe property helpers do not import a bundled catalog", async () => {
  const helpers = await source("lib/properties.ts");

  // The marketplace is real-data only: no view or helper may pin itself to a
  // bundled JSON catalog of fabricated listings.
  assert.doesNotMatch(helpers, /data\/properties\.json/);
});

test("client route views receive catalog data through server boundaries", async () => {
  const clientViews = await Promise.all([
    source("components/assistant/property-consultant.tsx"),
    source("components/mobile/messages-experience.tsx"),
    source("components/mobile/saved-journey.tsx"),
    source("components/dashboard/user-dashboard.tsx"),
    source("components/dashboard/property-crm.tsx"),
  ]);

  // Neither the server-side source nor any catalog import may reach a client
  // bundle: records arrive as props from server components.
  clientViews.forEach((view) => assert.doesNotMatch(view, /@\/lib\/property-source/));
  clientViews.forEach((view) => assert.match(view, /properties/));
});

test("auth, language, and trust labels use resilient truthful state", async () => {
  const [storage, auth, language, layout, crm] = await Promise.all([
    source("lib/local-storage.ts"),
    source("components/auth/auth-provider.tsx"),
    source("components/i18n/language-provider.tsx"),
    source("app/layout.tsx"),
    source("components/dashboard/property-crm.tsx"),
  ]);

  assert.match(storage, /readStoredString/);
  assert.match(storage, /removeStoredValue/);
  assert.doesNotMatch(auth, /window\.localStorage/);
  assert.doesNotMatch(language, /window\.localStorage/);
  assert.match(layout, /a7-property-language/);
  assert.match(crm, /user\?\.idVerified && user\.phoneVerified/);
});

test("property detail exposes split conversion and defers the interactive map", async () => {
  const [detail, sections] = await Promise.all([
    source("components/property/property-detail-view.tsx"),
    source("components/property/property-detail-sections.tsx"),
  ]);

  assert.match(detail, /tx\("Message", "စာပို့ရန်"\)/);
  assert.match(detail, /tx\("Request viewing", "အိမ်ကြည့်ရန်"\)/);
  assert.match(detail, /frontend demo did not send a moderation report/);
  assert.match(sections, /expanded \? \([\s\S]*?<PropertyMap/);
  assert.match(sections, /Approximate area preview/);
});

test("sign-in follows the shared language preference and offers no fake provider sign-in", async () => {
  const signIn = await source("components/auth/sign-in-view.tsx");

  assert.match(signIn, /useLanguage\(\)/);
  assert.doesNotMatch(signIn, /useState<Language>\("en"\)/);
  // The demo social buttons are gone entirely: there is no OAuth on either side.
  assert.doesNotMatch(signIn, /demo@a7\.local|Continue with Google|socialProvider/);
});

test("seeker and lister profile destinations match their labels", async () => {
  const profile = await source("components/mobile/profile-experience.tsx");

  const shell = await source("components/dashboard/dashboard-shell.tsx");
  assert.match(shell, /<Link href="\/profile"/);
  assert.doesNotMatch(shell, /href=\{role === "user" \? "\/profile" :/);
  assert.match(profile, /Saved Homes/);
  assert.match(profile, /\/owner\?section=properties/);
  assert.match(profile, /user\?\.accountType === "lister"/);
});

test("final device QA keeps compact layouts inside the viewport", async () => {
  const [css, cards, userDashboard, dashboardShell, mobileAppHeader, crm, searchBar, assistant, profile] = await Promise.all([
    source("app/globals.css"),
    source("components/ui/card.tsx"),
    source("components/dashboard/user-dashboard.tsx"),
    source("components/dashboard/dashboard-shell.tsx"),
    source("components/layout/mobile-app-header.tsx"),
    source("components/dashboard/property-crm.tsx"),
    source("components/search/property-search-bar.tsx"),
    source("components/assistant/a7-assistant-popover.tsx"),
    source("components/mobile/profile-experience.tsx"),
  ]);

  assert.doesNotMatch(css, /min-width:\s*320px/);
  assert.match(css, /overflow-x:\s*clip/);
  assert.match(cards, /flex min-w-0 flex-col/);
  assert.match(userDashboard, /useAuth\(\)/);
  assert.match(userDashboard, /grid-cols-\[minmax\(0,1fr\)\]/);
  assert.match(userDashboard, /A7Brand compact/);
  assert.match(dashboardShell, /A7Brand compact className="min-\[520px\]:hidden"/);
  assert.match(dashboardShell, /A7Brand inverted compact=\{role !== "user"\}/);
  assert.match(dashboardShell, /mobileLabelMy: "အိမ်များ"/);
  assert.match(dashboardShell, /mobileLabelMy: "စိစစ်"/);
  assert.match(dashboardShell, /mobileLabelMy: "ဆက်တင်"/);
  assert.match(mobileAppHeader, /hidden truncate[^\n]+min-\[360px\]:inline/);
  assert.match(crm, /min-\[380px\]:grid-cols-2/);
  assert.match(crm, /requestedSection === "overview"[\s\S]*?window\.scrollTo\(\{ top: 0, behavior: "instant" \}\)/);
  assert.match(searchBar, /min-h-11 min-w-0 flex-1/);
  assert.match(assistant, /inline-flex h-11 min-w-11 items-center/);
  assert.match(profile, /name: user\?\.fullName \?\? storedProfile\.name/);
});

test("design system v1 keeps shared chrome and semantic primitives frozen", async () => {
  const [css, publicNav, seekerNav, workspaceNav, appHeader, button, badge, designSystem] = await Promise.all([
    source("app/globals.css"),
    source("components/layout/mobile-bottom-nav.tsx"),
    source("components/dashboard/user-dashboard.tsx"),
    source("components/dashboard/dashboard-shell.tsx"),
    source("components/layout/app-header.tsx"),
    source("components/ui/button.tsx"),
    source("components/ui/badge.tsx"),
    source("docs/design-system.md"),
  ]);

  assert.match(css, /--surface-app:\s*#EAF4FF/);
  assert.match(css, /--surface-selected:\s*#DCEBFF/);
  assert.match(css, /\.a7-header-surface\s*\{/);
  assert.match(css, /\.a7-mobile-nav-shell\s*\{/);
  [publicNav, seekerNav, workspaceNav].forEach((nav) => assert.match(nav, /a7-mobile-nav-shell/));
  assert.doesNotMatch(appHeader, /AnimatedIcon/);
  assert.match(appHeader, /from "lucide-react"/);
  assert.match(button, /"secondary"[\s\S]*?"destructive"/);
  assert.match(badge, /"neutral"[\s\S]*?"verified"/);
  assert.match(designSystem, /Status:\*\* Frozen/);
  assert.match(designSystem, /Iconify is allowed only for brand, social, or external-service marks/);
});

test("generated 3D icons stay selective and respect reduced-motion preferences", async () => {
  const css = await source("app/globals.css");
  const [animatedIcon, animatedAssetIcon, assistant, comparison, inquiry, saved, messages, dashboard, search, homeDiscovery, propertyDetail, propertyDetailSections, profile, crm, informationPage, community, signIn, help, errorPage, privacy, terms, listingEditor, comparisonPage, consultant] = await Promise.all([
    source("components/ui/animated-icon.tsx"),
    source("components/ui/animated-asset-icon.tsx"),
    source("components/assistant/a7-assistant-popover.tsx"),
    source("components/compare/comparison-tray.tsx"),
    source("components/property/inquiry-sheet.tsx"),
    source("components/mobile/saved-journey.tsx"),
    source("components/mobile/messages-experience.tsx"),
    source("components/dashboard/user-dashboard.tsx"),
    source("components/mobile/mobile-property-search.tsx"),
    source("components/mobile/home-discovery.tsx"),
    source("components/property/property-detail-view.tsx"),
    source("components/property/property-detail-sections.tsx"),
    source("components/mobile/profile-experience.tsx"),
    source("components/dashboard/property-crm.tsx"),
    source("components/content/information-page.tsx"),
    source("app/community/page.tsx"),
    source("components/auth/sign-in-view.tsx"),
    source("app/help/page.tsx"),
    source("app/error.tsx"),
    source("app/privacy/page.tsx"),
    source("app/terms/page.tsx"),
    source("components/dashboard/listing-editor-sheet.tsx"),
    source("components/compare/property-comparison.tsx"),
    source("components/assistant/property-consultant.tsx"),
  ]);

  assert.match(animatedIcon, /IconVariant = [^;]+"depth"/);
  assert.match(animatedIcon, /initial=\{reduceMotion \? false/);
  assert.match(animatedIcon, /whileTap=\{reduceMotion \|\| hover !== "tilt"/);
  assert.doesNotMatch(animatedAssetIcon, /framer-motion/);
  assert.match(animatedAssetIcon, /a7-asset-icon--/);
  assert.match(animatedAssetIcon, /unoptimized = true/);
  assert.match(css, /prefers-reduced-motion:\s*reduce[\s\S]*?\.a7-asset-icon/);
  assert.match(assistant, /src="\/icons\/a7-property-match-3d\.png"/);
  assert.match(comparison, /src="\/icons\/a7-compare-homes-3d\.png"/);
  assert.match(inquiry, /src="\/icons\/a7-success-3d\.png"/);
  assert.match(saved, /src="\/icons\/a7-saved-home-3d\.png"/);
  assert.match(messages, /src="\/icons\/a7-messages-3d\.png"/);
  assert.match(dashboard, /src="\/icons\/a7-viewing-3d\.png"/);
  assert.match(search, /src="\/icons\/a7-explore-3d\.png"/);
  assert.match(homeDiscovery, /src="\/icons\/a7-personal-search-3d\.png"/);
  assert.match(homeDiscovery, /src="\/icons\/a7-location-choice-3d\.png"/);
  assert.match(homeDiscovery, /src="\/icons\/a7-recommended-home-3d\.png"/);
  assert.match(propertyDetail, /verification_status === "verified"[\s\S]*?src="\/icons\/a7-verified-home-3d\.png"/);
  assert.match(propertyDetail, /src="\/icons\/a7-home-overview-3d\.png"/);
  assert.match(propertyDetail, /src="\/icons\/a7-lister-contact-3d\.png"/);
  assert.match(propertyDetailSections, /src="\/icons\/a7-amenities-3d\.png"/);
  assert.match(propertyDetailSections, /src="\/icons\/a7-explore-3d\.png"/);
  assert.match(dashboard, /src="\/icons\/a7-home-journey-3d\.png"/);
  assert.match(profile, /src="\/icons\/a7-profile-3d\.png"/);
  assert.doesNotMatch(profile, /visualSrc="\/icons\/a7-account-details-3d\.png"/);
  assert.doesNotMatch(profile, /visualSrc="\/icons\/a7-home-preferences-3d\.png"/);
  assert.doesNotMatch(profile, /visualSrc="\/icons\/a7-support-legal-3d\.png"/);
  assert.match(crm, /src="\/icons\/a7-listing-workspace-3d\.png"/);
  assert.match(informationPage, /visualSrc\?: string/);
  assert.match(community, /visualSrc="\/icons\/a7-community-3d\.png"/);
  assert.match(signIn, /src="\/icons\/a7-account-access-3d\.png"/);
  assert.match(help, /visualSrc="\/icons\/a7-help-center-3d\.png"/);
  assert.match(errorPage, /src="\/icons\/a7-retry-home-3d\.png"/);
  assert.match(privacy, /visualSrc="\/icons\/a7-privacy-3d\.png"/);
  assert.match(terms, /visualSrc="\/icons\/a7-terms-3d\.png"/);
  assert.match(listingEditor, /src="\/icons\/a7-property-photos-3d\.png"/);
  assert.match(listingEditor, /src="\/icons\/a7-draft-saved-3d\.png"/);
  assert.match(comparisonPage, /src="\/icons\/a7-compare-homes-3d\.png"/);
  assert.match(comparisonPage, /src="\/icons\/a7-add-home-3d\.png"/);
  assert.match(consultant, /src="\/icons\/a7-property-match-3d\.png"/);
  assert.match(search, /src="\/icons\/a7-search-empty-3d\.png"/);
  assert.match(messages, /src="\/icons\/a7-conversation-empty-3d\.png"/);
  assert.match(saved, /src="\/icons\/a7-shortlist-empty-3d\.png"/);
  assert.match(dashboard, /src="\/icons\/a7-shortlist-empty-3d\.png"/);
  assert.match(crm, /src="\/icons\/a7-verification-documents-3d\.png"/);
  assert.match(crm, /src="\/icons\/a7-verification-saved-3d\.png"/);
  assert.match(inquiry, /"\/icons\/a7-contact-home-3d\.png"/);
  assert.match(inquiry, /"\/icons\/a7-schedule-viewing-3d\.png"/);
});

test("3D icon cutouts keep a real PNG alpha channel", async () => {
  const icons = (await readdir(new URL("../public/icons/", import.meta.url)))
    .filter((icon) => /^a7-.*-3d\.png$/.test(icon));

  assert.ok(icons.length >= 37, "the complete A7 3D icon family must remain available");

  for (const icon of icons) {
    const png = await readFile(new URL(`../public/icons/${icon}`, import.meta.url));

    assert.equal(png.subarray(1, 4).toString("ascii"), "PNG", `${icon} must remain a PNG`);
    assert.equal(png[24], 8, `${icon} must remain an 8-bit PNG`);
    assert.equal(png[25], 6, `${icon} must use RGBA instead of an opaque RGB background`);
  }
});

test("auth is server-backed only and keeps account state off the device", async () => {
  const [provider, client, signIn] = await Promise.all([
    readFile(new URL("../components/auth/auth-provider.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/api/client.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/auth/sign-in-view.tsx", import.meta.url), "utf8"),
  ]);

  // Which mode the app runs in is decided by one helper, so no component can
  // claim a server session that is not configured.
  assert.match(provider, /isApiConfigured\(\)/);
  assert.match(client, /export function isApiConfigured\(\)/);
  assert.match(client, /NEXT_PUBLIC_API_URL/);

  // There are no device-local accounts at all: without an API the session can
  // only be signed out, and no user is ever fabricated locally.
  assert.match(provider, /no accounts at all/);
  assert.doesNotMatch(provider, /writeStoredJson|removeStoredValue/);

  // The access token must stay in memory so a reload re-establishes the session
  // from the HttpOnly refresh cookie instead of from storage.
  assert.doesNotMatch(provider, /writeStoredJson\([^)]*accessToken/);
  assert.doesNotMatch(client, /localStorage|sessionStorage/);

  // Concurrent 401s must share one refresh: the backend treats a replayed
  // refresh token as a leak and revokes every session.
  assert.match(client, /if \(!refreshPromise\)/);

  // The sign-in form enforces the backend's own password rule (12+ characters
  // with letters and numbers) rather than a looser device-demo rule.
  assert.match(signIn, /const serverPasswordLength = 12;/);
  assert.match(signIn, /text\.serverPasswordHint/);

  // Without an API the sign-in screen says so plainly instead of offering a
  // demo account.
  assert.match(signIn, /noApiNotice/);
});

test("account email flow screens stay bilingual and never imply unsent mail", async () => {
  const views = await Promise.all(
    ["verify-email-view", "reset-password-view", "forgot-password-view"].map((name) =>
      readFile(new URL(`../components/auth/${name}.tsx`, import.meta.url), "utf8"),
    ),
  );

  for (const view of views) {
    // Every visible string goes through the shared language helper so these
    // screens follow the global switcher like the rest of the UI.
    assert.match(view, /useLanguage\(\)/);
    assert.match(view, /tx\(/);
    // Myanmar copy must actually be present, not an English fallback.
    assert.match(view, /[က-႟]/);
    // A missing API must be reported, never silently treated as success.
    assert.match(view, /no API configured|mode !== "server"/);
  }

  const [verify, reset] = views;
  // Both tokens are single-use, so neither screen may fire its request twice.
  assert.match(verify, /attempted\.current/);
  assert.match(reset, /signs out every device|every other device has been signed out/);
});

test("every property journey reads its data through the dual-mode source", async () => {
  const routes = await Promise.all([
    "app/page.tsx",
    "app/search/page.tsx",
    "app/properties/[id]/page.tsx",
    "app/compare/page.tsx",
    "app/assistant/page.tsx",
    "app/saved/page.tsx",
    "app/messages/page.tsx",
    "app/dashboard/page.tsx",
    "app/owner/page.tsx",
    "app/agent/page.tsx",
    "app/sitemap.ts",
  ].map((route) => source(route)));

  for (const route of routes) {
    // Every property journey must read through the single server-side source;
    // no route may import a bundled catalog of fabricated listings.
    assert.match(route, /@\/lib\/property-source/);
  }

  const sourceModule = await source("lib/property-source.ts");
  // Without an API there are no listings at all, and a failed server read must
  // not quietly fall back to invented inventory.
  assert.match(sourceModule, /NEXT_PUBLIC_API_URL/);
  assert.match(sourceModule, /if \(!API_URL\) return \[\]/);
  assert.match(sourceModule, /Property API request failed/);
});

test("device-local journeys became account-backed without inventing data", async () => {
  const [saved, conversations, viewings, portfolio] = await Promise.all([
    source("hooks/use-saved-homes.ts"),
    source("hooks/use-conversations.ts"),
    source("hooks/use-viewings.ts"),
    source("hooks/use-lister-portfolio.ts"),
  ]);

  for (const hook of [saved, conversations, viewings, portfolio]) {
    // One shared check decides the mode, so no journey can disagree about it.
    assert.match(hook, /isApiConfigured\(\)/);
  }

  // A fresh journey starts from nothing: no bundled demo fixtures may ever
  // stand in for a signed-in account's real data.
  assert.doesNotMatch(saved, /mockUser/);
  assert.doesNotMatch(conversations, /mockMessages/);
  assert.doesNotMatch(viewings, /mockAppointments/);
  for (const hook of [saved, conversations, viewings]) {
    assert.match(hook, /useState[^\n]*\[\]/);
  }

  // Saving is only offered where the API accepts it.
  assert.match(saved, /user\?\.accountType === "seeker"/);
  // A lister only ever sees their own inventory in server mode.
  assert.match(portfolio, /myProperties/);
  assert.match(portfolio, /user\?\.accountType !== "lister"/);
  // The thread view must not send a read receipt for a thread merely displayed.
  assert.match(conversations, /markRead/);
  assert.match(conversations, /Read receipts are only sent when the reader opens a thread themselves/);
  // The viewing-only lead flow must open a conversation through the backend
  // rather than inventing one in the browser.
  assert.match(conversations, /createConversationFromViewing/);
  assert.match(conversations, /startFromViewing/);
});

test("the CRM reply box opens a real thread from a viewing-only lead", async () => {
  const crm = await source("components/dashboard/property-crm.tsx");
  // The previous "we cannot open one, so say so plainly" dead-end must be gone
  // in server mode; the device-mode disclaimer is still kept.
  assert.match(crm, /startFromViewing/);
  assert.match(crm, /This lead has no message thread yet/);
  // Device mode must not try to call the server from the viewing-only branch.
  assert.match(crm, /if \(!serverBacked\)/);
});

test("server-backed journeys drop the device-local wording", async () => {
  const [inquiry, crm] = await Promise.all([
    source("components/property/inquiry-sheet.tsx"),
    source("components/dashboard/property-crm.tsx"),
  ]);

  // The demo disclaimers must stay for device mode and must not be shown once a
  // real message, request or listing is involved.
  assert.match(inquiry, /serverBacked/);
  assert.match(inquiry, /No message or viewing request was sent to the owner/);
  assert.match(inquiry, /The owner has been notified/);
  assert.match(crm, /Manage your listings, inquiries, and viewing requests/);
  assert.match(crm, /serverBacked \? tx\("Your properties"/);

  // Listing views and conversion analytics were removed with the mock data, so
  // the CRM must not present fabricated numbers as if they were measurements.
  assert.doesNotMatch(crm, /Illustrative frontend data/);
  assert.doesNotMatch(crm, /weeklyViews/);
  assert.doesNotMatch(crm, /Inquiry conversion/);
});


test("the CRM listing editor collects every field the backend requires and sends real uploads", async () => {
  const [editor, hook, crm] = await Promise.all([
    source("components/dashboard/listing-editor-sheet.tsx"),
    source("hooks/use-lister-portfolio.ts"),
    source("components/dashboard/property-crm.tsx"),
  ]);

  for (const field of ["title", "description", "address", "areaSqft", "price", "bedrooms", "bathrooms", "amenities", "furniture", "floor", "yearBuilt"]) {
    assert.match(editor, new RegExp(field));
  }

  // Photos are uploaded through the real endpoint, not fabricated locally.
  assert.match(editor, /uploadsApi\.uploadPropertyImage/);
  assert.match(editor, /image\/jpeg,image\/png,image\/webp/);
  // Device mode must not pretend uploads happened.
  assert.match(editor, /Photos cannot be uploaded in the device demo/);
  // The backend requires at least one photo to publish; the editor surfaces that.
  assert.match(editor, /You can publish once a photo is uploaded and your email is verified/);

  // The CRM sends a real create call in server mode and keeps the device
  // branch unchanged.
  assert.match(crm, /createNewListing\(\{/);
  assert.match(crm, /writeStoredJson\(STORAGE_KEYS\.crmDrafts/);
  // Publish, pause, archive are wired to real endpoints.
  assert.match(crm, /togglePublish/);
  assert.match(crm, /archiveListing/);
  // The hook maps to the API's CreatePropertyDto field names.
  assert.match(hook, /createProperty/);
  assert.match(hook, /archiveProperty/);
  assert.match(hook, /listingType: input\.purpose === "sale" \? "SALE" : "RENT"/);
});

test("sign-in presence children have unique stable keys including feedback and reset actions", async () => {
  const ts = (await import("typescript")).default;
  const file = ts.createSourceFile("sign-in-view.tsx", await source("components/auth/sign-in-view.tsx"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let checked = 0;
  function visit(node) {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(file) === "AnimatePresence" && node.getText(file).includes('key="role-step"')) {
      const keys = new Set();
      function check(child) {
        if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
          const attributes = ts.isJsxElement(child) ? child.openingElement.attributes : child.attributes;
          const key = attributes.properties.find((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(file) === "key");
          assert.ok(key?.initializer && ts.isStringLiteral(key.initializer), "presence child needs a stable string key");
          assert.ok(!keys.has(key.initializer.text), "presence children must not share keys");
          keys.add(key.initializer.text);
          checked++;
          return;
        }
        assert.ok(!ts.isJsxFragment(child), "unkeyed fragments must not be presence children");
        ts.forEachChild(child, check);
      }
      node.children.forEach(check);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(checked >= 8);
});

test("profile photo and name edits use the real account API with honest device copy", async () => {
  const source = await readFile(new URL("../components/mobile/profile-experience.tsx", import.meta.url), "utf8");
  assert.match(source, /await uploadAvatar\(file\)/);
  assert.match(source, /await updateServerProfile/);
  assert.match(source, /avatarUrl: updated.avatarUrl/);
  assert.match(source, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(source, /role="alert"/);
  assert.match(source, /Photos save immediately/);
  assert.match(source, /mode !== "server" \|\| uploading \|\| saving/);
});
