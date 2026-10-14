import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";

async function compile(path) {
  return ts.transpileModule(await readFile(new URL(`../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
}

test("concurrent authenticated 401 responses share one refresh rotation", async () => {
  const exports = {};
  let rotations = 0;
  let retries = 0;
  vm.runInNewContext(await compile("lib/api/client.ts"), {
    exports, process: { env: { NEXT_PUBLIC_API_URL: "https://api.example.test/api/v1" } }, URLSearchParams,
    async fetch(url, options) {
      assert.equal(options.credentials, "include");
      if (url.endsWith("/auth/refresh")) {
        rotations++;
        await new Promise(setImmediate);
        return new Response(JSON.stringify({ data: { accessToken: "test-fresh-token" } }), { status: 200 });
      }
      if (options.headers.Authorization !== "Bearer test-fresh-token") return new Response("{}", { status: 401 });
      retries++;
      return new Response(JSON.stringify({ data: { ok: true } }), { status: 200 });
    },
  });
  exports.setAccessToken("test-expired-token");
  const results = await Promise.all([exports.apiRequest("/saved-properties"), exports.apiRequest("/inquiries"), exports.apiRequest("/messages")]);
  assert.equal(rotations, 1);
  assert.equal(retries, 3);
  assert.ok(results.every(result => result.ok));
});

const guardSource = await compile("components/auth/require-auth.tsx");
function guard({ status, role, required = "lister" }) {
  const exports = {};
  const redirects = [];
  const stored = new Map();
  vm.runInNewContext(guardSource, {
    exports, window: { location: { search: "?tab=properties" }, sessionStorage: { setItem: (key, value) => stored.set(key, value) } },
    require(path) {
      if (path === "react/jsx-runtime") return jsxRuntime;
      if (path === "react") return { useEffect: fn => fn() };
      if (path === "next/navigation") return { usePathname: () => "/owner", useRouter: () => ({ replace: href => redirects.push(href) }) };
      if (path.endsWith("auth-provider")) return { useAuth: () => ({ status, user: role ? { accountType: role } : null }) };
      return { useLanguage: () => ({ tx: en => en }) };
    },
  });
  const result = exports.RequireAuth({ children: "protected-content", requireRole: required });
  return { redirects, stored, result };
}

test("signed-out guards preserve the requested URL and use replace navigation", () => {
  const result = guard({ status: "unauthenticated" });
  assert.equal(result.stored.get("a7-auth-return-to"), "/owner?tab=properties");
  assert.deepEqual(result.redirects, ["/sign-in?role=lister"]);
});

test("a seeker cannot gain lister access from the desktop List property link", () => {
  assert.deepEqual(guard({ status: "authenticated", role: "seeker" }).redirects, ["/dashboard"]);
  const lister = guard({ status: "authenticated", role: "lister" });
  assert.deepEqual(lister.redirects, []);
  assert.equal(lister.result.props.children, "protected-content");
});
