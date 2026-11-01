import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../components/layout/mobile-bottom-nav.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

function navigation(pathname, accountType, isMyanmar = false) {
  let props = null;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require(path) {
      if (path === "react/jsx-runtime") return require(path);
      if (path === "lucide-react") return new Proxy({}, { get: () => () => null });
      if (path === "next/navigation") return { usePathname: () => pathname };
      if (path.endsWith("auth-provider")) return { useAuth: () => ({ user: accountType ? { accountType } : null }) };
      if (path.endsWith("language-provider")) return { useLanguage: () => ({ isMyanmar, tx: (en, my) => isMyanmar ? my : en }) };
      if (path.endsWith("bottom-nav-bar")) return { BottomNavBar: (value) => { props = value; return null; } };
      throw new Error(`Unexpected import: ${path}`);
    },
  });
  renderToStaticMarkup(React.createElement(exports.MobileBottomNav));
  return props;
}

test("animated navigation preserves actual destinations and account-role restrictions", () => {
  for (const role of [undefined, "seeker", "lister"]) {
    const nav = navigation("/profile", role);
    assert.deepEqual(Array.from(nav.items, (item) => item.href), role === "lister"
      ? ["/", "/search?purpose=rent", "/messages", "/profile"]
      : ["/", "/search?purpose=rent", "/saved", "/messages", "/profile"]);
    assert.equal(nav.items[nav.activeIndex].href, "/profile");
  }
});

test("route selection and Myanmar labels stay synchronized with the application", () => {
  for (const [path, href, label] of [
    ["/", "/", "ပင်မ"], ["/search", "/search?purpose=rent", "လေ့လာ"],
    ["/assistant", "/search?purpose=rent", "လေ့လာ"], ["/compare", "/saved", "သိမ်းထား"],
    ["/messages", "/messages", "စာများ"], ["/profile", "/profile", "ပရိုဖိုင်"],
  ]) {
    const nav = navigation(path, "seeker", true);
    assert.equal(nav.items[nav.activeIndex].href, href);
    assert.equal(nav.items[nav.activeIndex].label, label);
  }
});

test("global navigation stays absent from sign-in, property detail, and dashboard journeys", () => {
  for (const path of ["/sign-in", "/properties/home-id", "/dashboard", "/owner", "/agent"]) {
    assert.equal(navigation(path, "seeker"), null, path);
  }
});
