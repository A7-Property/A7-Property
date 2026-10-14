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

async function guard({ status = "authenticated", accountType, customFallback = true, myanmar = false }) {
  const source = ts.transpileModule(await read("components/auth/require-auth.tsx"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {}, redirects = [], stored = new Map();
  let effect;
  vm.runInNewContext(source, {
    exports,
    window: { location: { search: "?create=1" }, sessionStorage: { setItem: (key, value) => stored.set(key, value) } },
    require(path) {
      if (path === "react/jsx-runtime") return require(path);
      if (path === "react") return { useEffect: (fn) => { effect = fn; } };
      if (path === "next/navigation") return { usePathname: () => "/owner", useRouter: () => ({ replace: (path) => redirects.push(path) }) };
      if (path.endsWith("auth-provider")) return { useAuth: () => ({ status, user: accountType ? { accountType } : null }) };
      if (path.endsWith("language-provider")) return { useLanguage: () => ({ tx: (en, my) => myanmar ? my : en }) };
      throw new Error(`Unexpected import: ${path}`);
    },
  });
  const element = exports.RequireAuth({
    requireRole: "lister",
    roleMismatchFallback: customFallback ? React.createElement("h1", null, "Lister account required") : undefined,
    children: React.createElement("div", null, "Private listing editor"),
  });
  const html = renderToStaticMarkup(element);
  effect();
  return { html, redirects, stored };
}

test("seeker and admin see a listing access notice without a dashboard redirect or listing editor", async () => {
  for (const accountType of ["seeker", "admin"]) {
    for (const myanmar of [false, true]) {
      const result = await guard({ accountType, myanmar });
      assert.match(result.html, /Lister account required/);
      assert.doesNotMatch(result.html, /Private listing editor/);
      assert.deepEqual(result.redirects, []);
    }
  }
  const lister = await guard({ accountType: "lister" });
  assert.match(lister.html, /Private listing editor/);
  assert.doesNotMatch(lister.html, /Lister account required/);
  assert.deepEqual(lister.redirects, []);
});

test("guests retain listing intent and get lister sign-in; other role redirects keep their existing behavior", async () => {
  const guest = await guard({ status: "unauthenticated" });
  assert.doesNotMatch(guest.html, /Private listing editor/);
  assert.deepEqual(guest.redirects, ["/sign-in?role=lister"]);
  assert.equal(guest.stored.get("a7-auth-return-to"), "/owner?create=1");
  const loading = await guard({ status: "loading" });
  assert.doesNotMatch(loading.html, /Private listing editor/);
  assert.deepEqual(loading.redirects, []);
  const legacy = await guard({ accountType: "seeker", customFallback: false });
  assert.deepEqual(legacy.redirects, ["/dashboard"]);
});

test("listing workspaces preserve the role guard and the editor deep link without granting roles in the browser", async () => {
  for (const path of ["app/owner/page.tsx", "app/agent/page.tsx"]) {
    assert.match(await read(path), /<RequireAuth requireRole="lister" roleMismatchFallback=\{<ListerAccessNotice \/>\}/);
  }
  const notice = await read("components/auth/lister-access-notice.tsx");
  assert.doesNotMatch(notice, /updateProfile|accountType:\s*["']lister|apiRequest/);
  assert.match(notice, /a7-auth-return-to", "\/owner\?create=1"/);
  const signIn = await read("components/auth/sign-in-view.tsx");
  assert.match(signIn, /searchParams.get\("role"\) === "lister" \? "lister" : "seeker"/);
  assert.match(signIn, /goToNextScreen\(signedIn.accountType\)/);
});

test("Sell opens the same lister-only create journey while Buy and Rent stay public discovery", async () => {
  const compiled = ts.transpileModule(await read("components/layout/intent-navigation.tsx"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  for (const myanmar of [false, true]) {
    const exports = {};
    vm.runInNewContext(compiled, {
      exports,
      require(path) {
        if (path === "react/jsx-runtime") return require(path);
        if (path === "lucide-react") return new Proxy({}, { get: () => () => null });
        if (path === "next/link") return { __esModule: true, default: ({ children, ...props }) => {
          delete props.onClick;
          return React.createElement("a", props, children);
        } };
        if (path === "next/navigation") return { usePathname: () => "/assistant", useSearchParams: () => new URLSearchParams() };
        if (path.endsWith("language-provider")) return { useLanguage: () => ({ isMyanmar: myanmar, tx: (en, my) => myanmar ? my : en }) };
        if (path.endsWith("utils")) return { cn: (...args) => args.filter(Boolean).join(" ") };
        throw new Error(`Unexpected import: ${path}`);
      },
    });
    const targets = Object.fromEntries(exports.intentLinks.map(({ id, href }) => [id, href]));
    assert.deepEqual(targets, { rent: "/search?purpose=rent", buy: "/search?purpose=sale", sell: "/owner?create=1&purpose=sale" });
    const html = renderToStaticMarkup(React.createElement(exports.IntentNavigation));
    assert.match(html, new RegExp(`<a href="/owner\\?create=1&amp;purpose=sale"[^>]*>${myanmar ? "ရောင်းရန်" : "Sell"}</a>`));
    assert.doesNotMatch(html, /journey=sell/);
  }
});
