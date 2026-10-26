import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const compiled = ts.transpileModule(await read("lib/web-search.ts"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const helpers = {};
vm.runInNewContext(compiled, { exports: helpers, URLSearchParams, require: () => ({ propertyTypeLabels: { condo: "Condo", house: "House", mini_condo: "Mini condo" } }) });

test("desktop search translates shareable filters to the existing backend contract", () => {
  const state = helpers.parseWebSearch(new URLSearchParams("purpose=sale&q=Bahan&min=100000&max=900000&beds=2&baths=1&type=mini_condo&verified=1&amenities=parking,security&furniture=FULLY_FURNISHED&sort=price-asc&page=3"));
  const filters = JSON.parse(JSON.stringify(helpers.webApiFilters(state)));
  assert.deepEqual(filters, { listingType: "SALE", search: "Bahan", propertyType: "MINI_CONDO", minPrice: 100000, maxPrice: 900000, bedrooms: 2, bathrooms: 1, verifiedOnly: true, furniture: "FULLY_FURNISHED", amenities: ["parking", "security"], sort: "price_asc", page: 3, limit: 24 });
  const roundTrip = helpers.parseWebSearch(helpers.webSearchParams(state));
  assert.deepEqual(JSON.parse(JSON.stringify(roundTrip)), JSON.parse(JSON.stringify(state)));
});

test("desktop search discards invalid numeric and enum values without inventing filters", () => {
  const state = helpers.parseWebSearch(new URLSearchParams("min=NaN&max=-1&beds=Infinity&type=fake&sort=fake&page=-1&furniture=fake"));
  assert.equal(state.min, null);
  assert.equal(state.max, null);
  assert.equal(state.beds, null);
  assert.equal(state.type, "");
  assert.equal(state.furniture, "");
  assert.equal(state.sort, "newest");
  assert.equal(state.page, 1);
  assert.equal(state.purpose, "rent");
});

test("explicit listing purpose wins over a stale legacy buy mode", () => {
  assert.equal(helpers.parseWebSearch(new URLSearchParams("purpose=rent&mode=buy")).purpose, "rent");
  assert.equal(helpers.parseWebSearch(new URLSearchParams("mode=buy")).purpose, "sale");
});

test("sign-in query hooks keep the production prerender Suspense boundary", async () => {
  const route = await read("app/sign-in/page.tsx");
  assert.match(route, /<Suspense[^>]*><SignInView\s*\/>\s*<\/Suspense>/);
});

test("a stalled desktop search offers an outage state and ignores its late result", async () => {
  const source = ts.transpileModule(await read("hooks/use-web-search.ts"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  let effect, deadline, resolve;
  const updates = [];
  let slot = 0;
  const pending = new Promise((done) => { resolve = done; });
  const exports = {};
  vm.runInNewContext(source, {
    exports, URLSearchParams, queueMicrotask,
    window: { setTimeout(fn, ms) { assert.equal(ms, 15_000); deadline = fn; return 1; }, clearTimeout() {} },
    require(path) {
      if (path === "react") return { useEffect(fn) { effect = fn; }, useState(initial) { const index = slot++; return [initial, value => updates.push({ index, value })]; } };
      if (path === "next/navigation") return { useSearchParams: () => new URLSearchParams("q=Slow") };
      if (path.endsWith("/client")) return { isApiConfigured: () => true };
      if (path.endsWith("/properties")) return { listProperties: () => pending };
      if (path.endsWith("/property-adapter")) return { fromApiProperty: value => value };
      return helpers;
    },
  });
  exports.useWebSearch({ properties: [], total: 0, totalPages: 0, unavailable: false }, "purpose=rent");
  const cleanup = effect();
  await new Promise(queueMicrotask);
  deadline();
  const failure = updates.find(update => update.index === 0);
  assert.equal(failure.value.page.unavailable, true);
  const count = updates.length;
  resolve({ data: [{ id: "late-record" }], meta: { total: 1, totalPages: 1 } });
  await new Promise(setImmediate);
  assert.equal(updates.length, count);
  cleanup();
});

test("web views preserve mobile/native screens and do not import server listing sources", async () => {
  const [home, search, responsive, saved, card, shell] = await Promise.all([read("app/page.tsx"), read("app/search/page.tsx"), read("components/web/responsive-marketplace.tsx"), read("hooks/use-web-saved-searches.ts"), read("components/web/web-property-card.tsx"), read("components/web/web-shell.tsx")]);
  assert.match(home, /CAPACITOR_BUILD === "1"/);
  assert.match(search, /CAPACITOR_BUILD === "1"/);
  assert.match(responsive, /useSyncExternalStore/);
  assert.match(responsive, /desktop \? <WebSearch.*: <MobilePropertySearch/);
  assert.doesNotMatch(responsive + card + shell, /@\/lib\/property-source/);
  assert.match(saved, /readStoredJson<unknown>\(STORAGE_KEYS.savedSearches, \[\]\)/);
  assert.doesNotMatch(saved, /defaultSavedSearches|notificationsEnabled: true/);
  assert.match(card, /ProgressiveImage/);
  assert.match(shell, /href="\/owner\?create=1"/);
});

test("lister discovery filters immediately by published-home location or lister name", async () => {
  const source = ts.transpileModule(await read("lib/lister-discovery.ts"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const listerHelpers = {};
  vm.runInNewContext(source, { exports: listerHelpers });
  const listers = [
    { id: "one", name: "Aye Aye", type: "agent", listings: [{ id: "yangon", title: "Yangon home", location: "Bahan, Yangon" }] },
    { id: "two", name: "Ko Min", type: "owner", listings: [{ id: "mandalay", title: "Mandalay home", location: "Chanayethazan, Mandalay" }] },
  ];

  assert.deepEqual(Array.from(listerHelpers.filterPublicListers(listers, "location", " yangon "), (item) => item.id), ["one"]);
  assert.deepEqual(Array.from(listerHelpers.filterPublicListers(listers, "name", "min"), (item) => item.id), ["two"]);
  assert.equal(listerHelpers.filterPublicListers([], "location", "Yangon").length, 0);
});

test("lister search stays interactive when no published homes exist", async () => {
  const view = await read("components/web/lister-discovery.tsx");
  assert.doesNotMatch(view, /disabled=!\{hasPublishedListers\}/);
  assert.match(view, /placeholder=\{mode === "location"/);
});
