import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const code = ts.transpileModule(readFileSync(new URL("../components/ui/private-document-preview.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const src = "http://localhost:4300/media/private-documents/owned.webp";
const tick = () => new Promise((resolve) => setImmediate(resolve));

function preview(download) {
  const values = [], deps = [], cleanups = [], pending = [], calls = [], revoked = [], created = [];
  const auth = { user: { id: "owner" }, status: "authenticated" };
  let slot = 0;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    URL: { createObjectURL(blob) { created.push(blob); return "blob:private-preview"; }, revokeObjectURL(url) { revoked.push(url); } },
    require(path) {
      if (path === "react/jsx-runtime") return require(path);
      if (path === "react") return {
        useState(initial) { const key = slot++; if (!(key in values)) values[key] = initial; return [values[key], (next) => { values[key] = typeof next === "function" ? next(values[key]) : next; }]; },
        useEffect(effect, dependencies) { const key = slot++; if (!deps[key] || dependencies.some((value, i) => value !== deps[key][i])) { deps[key] = dependencies; pending.push(() => { cleanups[key]?.(); cleanups[key] = effect(); }); } },
      };
      if (path.endsWith("auth-provider")) return { useAuth: () => auth };
      if (path.endsWith("language-provider")) return { useLanguage: () => ({ tx: (en) => en }) };
      if (path.endsWith("api/client")) return { apiDownload(url) { calls.push(url); return download(); } };
      if (path === "lucide-react") return { ExternalLink: () => null };
      return { Button: (props) => React.createElement("button", props) };
    },
  });
  function render() { slot = 0; const tree = exports.PrivateDocumentPreview({ src, alt: "Ownership evidence", label: "Document 1", openLabel: "Open document" }); pending.splice(0).forEach((effect) => effect()); return tree; }
  return { render, html: () => renderToStaticMarkup(render()), calls, revoked, created, auth, unmount: () => cleanups.forEach((cleanup) => cleanup?.()) };
}

test("private preview and full-size link use only an authenticated blob, revoked on logout", async () => {
  const view = preview(async () => new Blob(["private"]));
  assert.doesNotMatch(view.html(), /<img|href=/);
  await tick();
  assert.deepEqual(view.calls, [`/uploads/document?url=${encodeURIComponent(src)}`]);
  const html = view.html();
  assert.match(html, /src="blob:private-preview"/);
  assert.match(html, /href="blob:private-preview"/);
  assert.doesNotMatch(html, /localhost|_next\/image|private-documents/);
  view.auth.status = "unauthenticated";
  assert.doesNotMatch(view.html(), /<img|href=/);
  assert.deepEqual(view.revoked, ["blob:private-preview"]);
});

test("late responses after unmount cannot create a private blob", async () => {
  let finish;
  const view = preview(() => new Promise((resolve) => { finish = resolve; }));
  view.render();
  view.unmount();
  finish(new Blob(["private"]));
  await tick();
  assert.equal(view.created.length, 0);
});

test("a denied download shows an error and can be retried without a public URL fallback", async () => {
  let allowed = false;
  const view = preview(async () => { if (!allowed) throw new Error("Forbidden"); return new Blob(["private"]); });
  view.render();
  await tick();
  assert.match(view.html(), /Could not load this document/);
  assert.doesNotMatch(view.html(), /<img|href=/);
  allowed = true;
  view.render().props.children[1].props.onClick();
  assert.match(view.html(), /Loading document/);
  await tick();
  assert.match(view.html(), /src="blob:private-preview"/);
  assert.equal(view.calls.length, 2);
  view.unmount();
});
