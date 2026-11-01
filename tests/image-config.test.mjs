import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { hasRemoteMatch } = require("next/dist/shared/lib/match-remote-pattern.js");
const compiled = ts.transpileModule(readFileSync(new URL("../next.config.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function patterns(apiUrl) {
  const exports = {};
  vm.runInNewContext(compiled, { exports, require, URL, process: { env: { NEXT_PUBLIC_API_URL: apiUrl } } });
  return exports.default.images.remotePatterns;
}

test("uploaded images follow the configured API origin, including its port", () => {
  for (const apiUrl of ["http://localhost:4300/api/v1", "http://127.0.0.1:4400/api/v1", "https://api.example.test/api/v1"]) {
    const allowed = patterns(apiUrl);
    assert.equal(hasRemoteMatch([], allowed, new URL("/media/properties/photo.webp", apiUrl)), true);
    assert.equal(hasRemoteMatch([], allowed, new URL("/api/v1/private/photo.webp", apiUrl)), false);
    assert.equal(hasRemoteMatch([], allowed, new URL("https://untrusted.example/media/photo.webp")), false);
  }
  assert.equal(hasRemoteMatch([], patterns("http://localhost:4300/api/v1"), new URL("http://localhost:4000/media/photo.webp")), false);
});

test("default local API media remains supported without an API setting", () => {
  assert.equal(hasRemoteMatch([], patterns(undefined), new URL("http://localhost:4000/media/properties/photo.webp")), true);
});
