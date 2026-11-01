import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const compile = (source) => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };

async function editor(onSave, upload = async () => ({ id: "new-document", url: "https://example.invalid/document" })) {
  const values = [], dependencies = [], effects = [];
  let index = 0;
  const hooks = {
    ...React,
    useState(initial) { const slot = index++; if (!(slot in values)) values[slot] = initial; return [values[slot], (next) => { values[slot] = typeof next === "function" ? next(values[slot]) : next; }]; },
    useRef(initial) { const slot = index++; if (!(slot in values)) values[slot] = { current: initial }; return values[slot]; },
    useCallback(fn) { return fn; },
    useEffect(fn, deps) { const slot = index++; if (!dependencies[slot] || deps.some((item, key) => item !== dependencies[slot][key])) { dependencies[slot] = deps; effects.push(fn); } },
  };
  const numbers = {}, properties = {};
  vm.runInNewContext(compile(await read("lib/myanmar-numbers.ts")), { exports: numbers });
  vm.runInNewContext(compile(await read("lib/properties.ts")), { exports: properties, require: () => numbers });
  const exports = {};
  const frame = ({ children, footer }) => React.createElement("section", null, children, footer);
  const button = ({ children, ...props }) => React.createElement("button", { disabled: props.disabled }, children);
  vm.runInNewContext(compile(await read("components/dashboard/listing-editor-sheet.tsx")), {
    exports, queueMicrotask,
    require(path) {
      if (path === "react") return hooks;
      if (path === "react/jsx-runtime") return require(path);
      if (path === "lucide-react") return new Proxy({}, { get: () => () => null });
      if (path.endsWith("language-provider")) return { useLanguage: () => ({ tx: (en) => en }) };
      if (path.endsWith("api/client")) return { isApiConfigured: () => true, ApiError: class extends Error {} };
      if (path.endsWith("api/uploads")) return { uploadPropertyDocument: upload };
      if (path.endsWith("lib/properties")) return properties;
      return { Button: button, Sheet: frame, ProgressiveImage: () => null, PrivateDocumentPreview: () => null, AnimatedAssetIcon: () => null };
    },
  });
  const property = { id: "owned", title: "Existing owned listing", description: "An existing property with sufficient details for validation.", address: "Existing address", city: "Yangon", township: "Bahan", purpose: "sale", property_type: "house", price: 100, currency: "MMK", bedrooms: 1, bathrooms: 1, area_sqft: 100, floor: null, year_built: null, furniture: null, amenities: [], images: [], documents: [], image_asset_ids: [] };
  const props = { open: true, onOpenChange() {}, property, onSave };
  const render = () => { index = 0; return exports.ListingEditorSheet(props); };
  render(); effects.splice(0).forEach((fn) => fn()); await Promise.resolve();
  return { render, html: () => renderToStaticMarkup(render()) };
}

test("listing save waits for acknowledgement, rejects duplicate clicks and retains fields on failure", async () => {
  const request = deferred(); let calls = 0;
  const view = await editor(() => { calls++; return request.promise; });
  const first = view.render().props.footer.props.onClick();
  await view.render().props.footer.props.onClick();
  assert.equal(calls, 1);
  assert.equal(view.render().props.footer.props.disabled, true);
  assert.doesNotMatch(view.html(), /Property updated/);
  request.resolve(false); await first;
  assert.match(view.html(), /Save failed/);
  assert.match(view.html(), /value="Existing owned listing"/);
  assert.doesNotMatch(view.html(), /Property updated/);
});

test("listing success appears only after a successful response", async () => {
  const request = deferred();
  const view = await editor(() => request.promise);
  const saving = view.render().props.footer.props.onClick();
  assert.doesNotMatch(view.html(), /Property updated/);
  request.resolve(true); await saving;
  assert.match(view.html(), /Property updated/);
});

test("document upload prevents saving until its asset reference is available", async () => {
  const upload = deferred(); let saved = 0;
  const view = await editor(async () => { saved++; return true; }, () => upload.promise);
  const inputs = [];
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.type === "input" && node.props.type === "file") inputs.push(node);
    visit(node.props.children);
  }
  visit(view.render());
  const uploading = inputs.at(-1).props.onChange({ target: { files: [{ name: "ownership.png" }], value: "" } });
  assert.equal(view.render().props.footer.props.disabled, true);
  await view.render().props.footer.props.onClick();
  assert.equal(saved, 0);
  upload.resolve({ id: "owned-upload", url: "https://example.invalid/document" });
  await uploading;
  assert.equal(view.render().props.footer.props.disabled, false);
});

test("all collection pages are loaded, and a later-page failure is not silently treated as complete", async () => {
  const exports = {};
  vm.runInNewContext(compile(await read("lib/api/client.ts")), { exports, process: { env: {} } });
  const calls = [];
  const result = await exports.collectPages(async (page) => { calls.push(page); return { data: [page], meta: { totalPages: 3 } }; });
  assert.deepEqual(Array.from(result), [1, 2, 3]);
  assert.deepEqual(calls, [1, 2, 3]);
  await assert.rejects(exports.collectPages(async (page) => { if (page === 2) throw new Error("offline"); return { data: [1], meta: { totalPages: 2 } }; }), /offline/);
});

test("reply/read and attachment contracts prevent the observed status and document regressions", async () => {
  const crm = await read("components/dashboard/property-crm.tsx");
  assert.match(crm, /thread\.at\(-1\)\?\.sender === "user" \? "Replied"/);
  const conversations = await read("hooks/use-conversations.ts");
  assert.match(conversations, /markConversationRead\(conversationId\)\.then\(acknowledge\)/);
  assert.match(conversations, /result\.meta\.nextCursor/);
  const sheet = await read("components/dashboard/listing-editor-sheet.tsx");
  assert.match(sheet, /disabled=\{busy \|\| submitting \|\| uploading > 0 \|\| uploadingDocs > 0\}/);
  assert.match(sheet, /documentId: d\.id/);
  assert.match(sheet, /property-ownership-document-sample\.png/);
  assert.match(sheet, /View Sample Ownership Document/);
  assert.match(sheet, /aria-expanded=\{showOwnershipSample\}/);
  assert.match(sheet, /src=\{doc\.documentUrl\}/);
  assert.match(sheet, /<PrivateDocumentPreview/);
  assert.doesNotMatch(sheet, /href=\{doc\.documentUrl\}/);
  assert.match(sheet, /Open ownership document/);
  assert.doesNotMatch(sheet, /application\/pdf/);
});


test("verification resend keeps a transport failure separate from request acknowledgement", async () => {
  const values = []; let slot = 0; const exports = {};
  const pending = deferred();
  vm.runInNewContext(compile(await read("components/auth/verify-email-view.tsx")), {
    exports,
    require(path) {
      if (path === "react/jsx-runtime") return require(path);
      if (path === "react") return {
        useState(initial) { const key = slot++; if (!(key in values)) values[key] = initial; return [values[key], (value) => { values[key] = value; }]; },
        useRef: () => ({ current: false }), useEffect() {},
      };
      if (path === "next/navigation") return { useSearchParams: () => new URLSearchParams() };
      if (path.endsWith("auth-provider")) return { useAuth: () => ({ mode: "server", user: { email: "test@example.invalid" } }) };
      if (path.endsWith("language-provider")) return { useLanguage: () => ({ tx: (en) => en }) };
      if (path.endsWith("api/auth")) return { resendVerification: () => pending.promise.then(() => { throw new Error("offline"); }) };
      if (path.endsWith("api/client")) return { ApiError: class extends Error {} };
      return { AuthTokenShell: ({ children }) => children, Button: ({ children }) => children, __esModule: true, default: ({ children }) => children };
    },
  });
  const render = () => { slot = 0; return exports.VerifyEmailView(); };
  const submit = render().props.children.props.onSubmit({ preventDefault() {} });
  const text = () => renderToStaticMarkup(render());
  assert.doesNotMatch(text(), /a new link is on its way/);
  pending.resolve(); await submit;
  assert.match(text(), /The request could not be sent/);
  assert.doesNotMatch(text(), /a new link is on its way/);
});
