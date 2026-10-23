import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const require = createRequire(import.meta.url);

async function renderHeader(user, myanmar) {
  const compiled = ts.transpileModule(await read("components/web/web-shell.tsx"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require(path) {
      if (path === "react/jsx-runtime") return require(path);
      if (path === "next/link") return { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) };
      if (path === "lucide-react") return new Proxy({}, { get: () => () => null });
      if (path.endsWith("auth-provider")) return { useAuth: () => ({ user }) };
      if (path.endsWith("language-provider")) return { useLanguage: () => ({ tx: (en, my) => myanmar ? my : en }) };
      if (path.endsWith("a7-brand")) return { A7Brand: () => "A7 Property" };
      if (path.endsWith("language-switcher")) return { LanguageSwitcher: () => null };
      if (path.endsWith(".css")) return {};
      throw new Error(`Unexpected import: ${path}`);
    },
  });
  return renderToStaticMarkup(React.createElement(exports.WebShell, null, "Content"));
}

test("My account opens profile for every signed-in role while listers are not offered seeker saves", async () => {
  for (const myanmar of [false, true]) {
    for (const accountType of ["seeker", "lister", "admin"]) {
      const html = await renderHeader({ accountType }, myanmar);
      assert.match(html, new RegExp(`<a href="/profile"[^>]*>${myanmar ? "ကျွန်ုပ်အကောင့်" : "My account"}</a>`));
      if (accountType === "lister") assert.doesNotMatch(html, /<a href="\/saved" class="web-saved-link">/);
      else assert.match(html, /<a href="\/saved" class="web-saved-link">/);
      assert.match(html, /<a href="\/owner\?create=1">/); // Listing management retains its own entry.
    }
    const html = await renderHeader(null, myanmar);
    assert.match(html, new RegExp(`<a href="/sign-in"[^>]*>${myanmar ? "အကောင့်ဝင်ရန်" : "Sign in"}</a>`));
  }
});

test("saved-home entry points use the dedicated saved journey rather than a dashboard anchor", async () => {
  for (const path of [
    "components/web/web-shell.tsx", "components/layout/app-header.tsx",
    "components/dashboard/user-dashboard.tsx", "components/dashboard/dashboard-shell.tsx",
    "components/search/search-navbar.tsx", "components/search/property-search.tsx",
    "components/profile/user-profile.tsx",
  ]) {
    const source = await read(path);
    assert.doesNotMatch(source, /\/dashboard\?section=saved/, path);
    assert.match(source, /href[=:]\s*["']\/saved["']/, path);
  }
  const route = await read("app/saved/page.tsx");
  assert.match(route, /<RequireAuth requireRole="seeker"><SavedJourney/);
});
