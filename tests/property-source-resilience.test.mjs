import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../lib/property-source.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function load(fetch, api = "https://api.example.org/api/v1", capacitor = "") {
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, process: { env: { NEXT_PUBLIC_API_URL: api, CAPACITOR_BUILD: capacitor } }, fetch, AbortSignal, URLSearchParams,
    require: () => ({ fromApiProperty: value => value }),
  });
  return exports;
}
test("listing outages retry with bounded requests and return an empty marketplace", async () => {
  let calls = 0;
  const properties = load(async (_url, options) => {
    calls++;
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.cache, "no-store");
    throw new Error("API down");
  });
  assert.equal((await properties.getAllProperties()).length, 0);
  assert.equal(calls, 2);
  assert.equal((await properties.getSimilarProperties("id")).length, 0);
  assert.equal(calls, 4);
  await assert.rejects(properties.getPropertyById("id"), /Property API request failed/);
});

test("native exports take actual API snapshots rather than invoking request-time fetch", async () => {
  const properties = load(async (_url, options) => {
    assert.equal(options.cache, "force-cache");
    return new Response(JSON.stringify({ data: { id: "real-property" } }));
  }, "https://api.example.org/api/v1", "1");
  assert.equal((await properties.getPropertyById("real-property")).id, "real-property");
});

test("live listing routes establish a request boundary before reading the API", async () => {
  for (const file of ["app/page.tsx", "app/listers/page.tsx", "app/properties/[id]/page.tsx"]) {
    const route = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(route, /import \{ connection \} from "next\/server"/);
    assert.match(route, /isServerBacked\(\) && process\.env\.CAPACITOR_BUILD !== "1"\) await connection\(\)/);
  }
});
test("device mode never makes listing requests", async () => {
  const properties = load(() => { throw new Error("Unexpected request"); }, "");
  assert.equal((await properties.getAllProperties()).length, 0);
  assert.equal((await properties.getSimilarProperties("id")).length, 0);
});

test("server search preserves real pagination metadata and API filters", async () => {
  let requested;
  const properties = load(async (url, options) => {
    requested = new URL(url);
    assert.equal(options.cache, "no-store");
    return new Response(JSON.stringify({ data: [{ id: "real-record" }], meta: { total: 51, totalPages: 3, page: 2, limit: 24 } }), { status: 200 });
  });
  const result = await properties.getPropertySearch({ listingType: "SALE", search: "Bahan", amenities: ["parking", "security"], page: 2, limit: 24 });
  assert.equal(result.properties[0].id, "real-record");
  assert.equal(result.total, 51);
  assert.equal(result.totalPages, 3);
  assert.equal(result.unavailable, false);
  assert.equal(requested.searchParams.get("listingType"), "SALE");
  assert.equal(requested.searchParams.get("amenities"), "parking,security");
});

test("server search distinguishes an outage from an empty unconfigured marketplace", async () => {
  const outage = load(async () => { throw new Error("Offline"); });
  const result = await outage.getPropertySearch({ listingType: "RENT" });
  assert.equal(result.properties.length, 0);
  assert.equal(result.unavailable, true);
  const device = load(() => { throw new Error("Unexpected request"); }, "");
  assert.equal((await device.getPropertySearch({})).unavailable, false);
});
