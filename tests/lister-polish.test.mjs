import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const compile = (source) => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;

async function helpers() {
  const numbers = {}, exports = {};
  vm.runInNewContext(compile(await read("lib/myanmar-numbers.ts")), { exports: numbers });
  vm.runInNewContext(compile(await read("lib/properties.ts")), { exports, require: () => numbers });
  return exports;
}

test("property management combines search, purpose and status without hiding later pages", async () => {
  const { getListerPropertyPage } = await helpers();
  const records = Array.from({ length: 15 }, (_, index) => ({ id: String(index), title: `Bahan home ${index}`, township: "Bahan", address: "Example address", purpose: index % 2 ? "rent" : "sale", listing_status: index < 10 ? "PUBLISHED" : "DRAFT" }));
  const all = { query: "", status: "all", purpose: "all", page: 3 };
  const last = getListerPropertyPage(records, all);
  assert.deepEqual(Array.from(last.items, (item) => item.id), ["12", "13", "14"]);
  assert.equal(last.first, 13); assert.equal(last.last, 15);
  const narrowed = getListerPropertyPage(records, { ...all, query: " bahan ", purpose: "sale", status: "DRAFT" });
  assert.deepEqual(Array.from(narrowed.items, (item) => item.id), ["10", "12", "14"]);
  assert.equal(narrowed.page, 1);
  const afterRemoval = getListerPropertyPage(records.slice(0, 5), all);
  assert.equal(afterRemoval.page, 1); assert.equal(afterRemoval.total, 5);
  const empty = getListerPropertyPage(records, { ...all, query: "no match" });
  assert.equal(empty.first, 0); assert.equal(empty.last, 0); assert.equal(empty.total, 0);
});

test("property management keeps outages distinct from empty inventory and uses bilingual controls", async () => {
  const properties = await helpers();
  const exports = {};
  let myanmar = false;
  const frame = ({ children }) => React.createElement("div", null, children);
  const button = ({ children, ...props }) => React.createElement("button", props, children);
  vm.runInNewContext(compile(await read("components/dashboard/lister-properties-panel.tsx")), {
    exports,
    require(path) {
      if (path === "react/jsx-runtime") return require(path);
      if (path === "react") return { useState: (value) => [value, () => {}] };
      if (path === "lucide-react") return new Proxy({}, { get: () => () => null });
      if (path.endsWith("language-provider")) return { useLanguage: () => ({ isMyanmar: myanmar, tx: (en, my) => myanmar ? my : en }) };
      if (path.endsWith("lib/properties")) return properties;
      return { Button: button, Badge: frame, Skeleton: frame, ProgressiveImage: () => null };
    },
  });
  const render = (extra) => renderToStaticMarkup(React.createElement(exports.ListerPropertiesPanel, { properties: [], ready: true, failed: false, pendingIds: [], serverBacked: true, ...extra }));
  assert.match(render({}), /No properties yet/);
  const failed = render({ failed: true });
  assert.match(failed, /role="alert"/); assert.match(failed, /Properties could not be loaded/); assert.doesNotMatch(failed, /No properties yet/);
  assert.match(render({ ready: false }), /Loading properties/);
  myanmar = true;
  assert.match(render({}), /အိမ်စာရင်း မရှိသေးပါ/);
});

test("message receipts display Read only for acknowledged API read flags", async () => {
  const properties = await helpers();
  const exports = {};
  const frame = ({ children, className, ...props }) => React.createElement("div", { className, "aria-label": props["aria-label"] }, children);
  const button = ({ children, ...props }) => React.createElement("button", props, children);
  const conversation = { id: "conversation", contact: "Test seeker", propertyId: "unpublished", propertySnapshot: { id: "unpublished", title: "Unavailable listing", township: "Bahan", images: [] }, preview: "Stored message", time: "Oct 11", unread: true, thread: [{ id: "sent", sender: "user", text: "Sent but unread", time: "Oct 11", isRead: false }, { id: "read", sender: "user", text: "Acknowledged read", time: "Oct 11", isRead: true }] };
  vm.runInNewContext(compile(await read("components/mobile/messages-experience.tsx")), {
    exports,
    require(path) {
      if (path === "react/jsx-runtime") return require(path);
      if (path === "react") return { useState: (value) => [value, () => {}], useRef: (value) => ({ current: value }), useMemo: (fn) => fn(), useEffect() {}, useSyncExternalStore: () => true };
      if (path === "lucide-react") return new Proxy({}, { get: () => () => null });
      if (path === "framer-motion") return { motion: new Proxy({}, { get: (_, tag) => ({ children, className, "aria-label": label }) => React.createElement(tag, { className, "aria-label": label }, children) }), useReducedMotion: () => true };
      if (path.endsWith("language-provider")) return { useLanguage: () => ({ tx: (en) => en }) };
      if (path.endsWith("auth-provider")) return { useAuth: () => ({ user: { fullName: "Test lister", accountType: "lister" } }) };
      if (path.endsWith("use-conversations")) return { useConversations: () => ({ ready: true, failed: false, conversations: [conversation], loadThread() {} }) };
      if (path.endsWith("lib/properties")) return properties;
      if (path.endsWith("lib/utils")) return { cn: (...args) => args.filter(Boolean).join(" ") };
      if (path === "next/link") return { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) };
      return new Proxy({}, { get: (_, key) => key === "Sheet" ? ({ open, children }) => open ? children : null : key === "Button" ? button : frame });
    },
  });
  const html = renderToStaticMarkup(React.createElement(exports.MessagesExperience, { properties: [] }));
  assert.equal((html.match(/aria-label="Sent"/g) ?? []).length, 1);
  assert.equal((html.match(/aria-label="Read"/g) ?? []).length, 1);
  assert.match(html, /Contact verification unavailable/);
  assert.doesNotMatch(html, /Phone verified|>Today</);
  assert.doesNotMatch(html, /href="\/properties\/unpublished"/);
});
