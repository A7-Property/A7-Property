import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";

import { getUpcomingViewingDates, isViewingDatePast, viewingDateBadge } from "../lib/viewing-dates.ts";

const serverConfigured = Boolean(process.env.NEXT_PUBLIC_API_URL);

// Run the actual production modules in workerd. The Cloudflare build imports
// cloudflare:workers, which Node's ESM loader cannot execute faithfully.
let runtime;
async function workerRuntime() {
  const root = new URL("../dist/server/", import.meta.url);
  const config = JSON.parse(await readFile(new URL("wrangler.json", root), "utf8"));
  const names = await readdir(root, { recursive: true });
  const modules = ["index.js", ...names.filter((name) => name !== "index.js" && name.endsWith(".js"))]
    .map((name) => ({ type: "ESModule", path: fileURLToPath(new URL(name, root)) }));
  return new Miniflare(convertV4MiniflareOptions({
    modules,
    modulesRoot: fileURLToPath(root),
    compatibilityDate: config.compatibility_date,
    compatibilityFlags: config.compatibility_flags,
    serviceBindings: { ASSETS: () => new Response("Not found", { status: 404 }) },
    // Keep real configured API requests in the Node host's local network.
    outboundService: async (request) => fetch(request.url, {
      method: request.method,
      headers: Object.fromEntries(request.headers),
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
    }),
  }));
}
after(async () => { if (runtime) await (await runtime).dispose(); });

async function render(pathname = "/") {
  runtime ??= workerRuntime();
  return (await runtime).dispatchFetch(`http://localhost${pathname}`, { headers: { accept: "text/html" } });
}

test("server-renders the A7 Property discovery homepage", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>A7 Property — Find a place you can call home<\/title>/i);
  assert.match(html, /Find Your Place/);
  assert.match(html, /visible verification status/i);
  assert.match(html, /Explore home matching/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("public pages keep the baseline accessibility structure", async () => {
  for (const pathname of ["/", "/search?purpose=rent"]) {
    const response = await render(pathname);
    const html = await response.text();
    const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];

    assert.equal(response.status, 200, pathname);
    assert.match(html, /<html\b[^>]*\blang="en"/i, pathname);
    assert.match(html, /<a\b[^>]*href="#main-content"[^>]*>Skip to main content<\/a>/i, pathname);
    assert.match(html, /\bid="main-content"/i, pathname);
    assert.match(html, /<h1\b/i, pathname);
    assert.ok(imageTags.every((tag) => /\balt="[^"]*"/i.test(tag)), `${pathname} has an image without alt text`);
  }
});

test("server-renders representative public product routes", async () => {
  const routes = [
    ["/search?purpose=rent&location=Yangon", /Yangon Rental Listings/i],
    ["/compare", /<title>Compare homes \| A7 Property<\/title>/i],
    ["/assistant", /A7 matching demo/i],
    ["/sign-in", /How would you like to use A7/i],
  ];

  for (const [pathname, expected] of routes) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    assert.match(await response.text(), expected, pathname);
  }
});

test("unknown properties render an unindexable not-found page, including streamed responses", async () => {
  // With no bundled catalog, a listing that the API does not know about must
  // render the real not-found page rather than invented inventory.
  const response = await render("/properties/MM-PROP-001");
  const html = await response.text();
  // Next-compatible streaming may commit the shell before notFound() runs.
  assert.ok(response.status === 404 || response.status === 200);
  assert.match(html, /404|not found/i);
  assert.match(html, /<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i);
});

test("private frontend-demo routes render an auth boundary", async () => {
  for (const pathname of ["/saved", "/messages", "/profile", "/dashboard", "/owner", "/agent"]) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    assert.match(await response.text(), /animate-spin|sign in/i, pathname);
  }
});

test("no bundled catalog of fabricated listings ships with the app", async () => {
  const [dataDir, publicDir, helpers, propertySource] = await Promise.all([
    readdir(new URL("../data", import.meta.url)).catch(() => []),
    readdir(new URL("../public/data", import.meta.url)).catch(() => []),
    readFile(new URL("../lib/properties.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/property-source.ts", import.meta.url), "utf8"),
  ]);

  // The demo JSON catalog is gone: listings only ever come from the API.
  assert.equal(dataDir.length, 0);
  assert.equal(publicDir.length, 0);
  assert.doesNotMatch(helpers, /properties\.json/);
  assert.doesNotMatch(propertySource, /property-catalog/);
});

test("builds future viewing choices from the Yangon calendar date", () => {
  const options = getUpcomingViewingDates(new Date("2026-08-23T00:00:00.000Z"));

  assert.deepEqual(options.map((option) => option.value), ["2026-08-24", "2026-08-25", "2026-08-26"]);
  assert.deepEqual(viewingDateBadge(options[0].englishLabel), { day: "24", weekday: "Mon" });
  assert.ok(options.every((option) => option.englishLabel && option.myanmarLabel));
});

test("detects expired human-readable viewing dates in the Yangon calendar", () => {
  const now = new Date("2026-08-23T00:00:00.000Z");

  assert.equal(isViewingDatePast("Sunday, 26 July", now), true);
  assert.equal(isViewingDatePast("Monday, 24 August", now), false);
  assert.equal(isViewingDatePast("2026-08-22", now), true);
  assert.equal(isViewingDatePast("Friday, 2 January", new Date("2026-12-31T00:00:00.000Z")), false);
});

test("account email flows reflect the build's configured API mode", async () => {
  // The backend's verification and reset emails link here, so these routes must
  // exist and must say plainly that this build has no API rather than appearing
  // to confirm anything.
  const routes = [
    ["/verify-email", /Verify your email/i],
    ["/verify-email?token=not-a-real-token", /Verify your email/i],
    ["/reset-password", /Set a new password/i],
    ["/forgot-password", /Reset your password/i],
  ];

  for (const [pathname, expected] of routes) {
    const response = await render(pathname);
    const html = await response.text();
    assert.equal(response.status, 200, pathname);
    assert.match(html, expected, pathname);
    assert.match(html, /<h1\b/i, pathname);
    assert.match(html, /\bid="main-content"/i, pathname);
    if (serverConfigured) assert.doesNotMatch(html, /no API configured/i, pathname);
    else assert.match(html, /no API configured/i, pathname);
    // Nothing may imply a real email was sent or an address was confirmed.
    assert.doesNotMatch(html, /your email is confirmed|a reset link is on its way/i, pathname);
  }
});

test("account email flows are excluded from search indexing", async () => {
  for (const pathname of ["/verify-email", "/reset-password", "/forgot-password"]) {
    const html = await (await render(pathname)).text();
    assert.match(html, /<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i, pathname);
  }
});

test("web marketplace routes expose truthful API mode with a single route heading", async () => {
  for (const pathname of ["/", "/search?purpose=sale", "/search?purpose=rent", "/listers", "/saved-searches"]) {
    const response = await render(pathname);
    const html = await response.text();
    assert.equal(response.status, 200, pathname);
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, pathname);
    assert.doesNotMatch(html, /Within BuyAbility|Zillow Home Loans|Nick Curtis|Paula Knight/, pathname);
    if (pathname === "/saved-searches") assert.match(html, /saved on this browser only/i);
    else if (serverConfigured) assert.doesNotMatch(html, /no API configured/i);
    else assert.match(html, /no API configured/i);
  }
});
