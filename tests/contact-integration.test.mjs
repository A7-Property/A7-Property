import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import vm from "node:vm";

async function load(path) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports });
  return exports;
}

test("contact messages carry the chosen reply preference through the existing API body", async () => {
  const { composeContactMessage } = await load("lib/contact-message.ts");
  assert.equal(composeContactMessage("  Is this available?  ", false, "Phone reply requested"), "Is this available?");
  assert.equal(composeContactMessage("Is this available?", true, "Phone reply requested"), "Is this available?\n\nPhone reply requested");
  const sheet = await readFile(new URL("../components/property/inquiry-sheet.tsx", import.meta.url), "utf8");
  assert.match(sheet, /sendMessage\(conversation.id, contactMessage\)/);
});

test("missing server response time remains unknown instead of becoming an instant reply claim", async () => {
  const { fromApiProperty } = await load("lib/api/property-adapter.ts");
  const record = { images: [], owner: { id: "local-test", firstName: "Test", lastName: "Owner", responseTimeMinutes: null } };
  assert.equal(fromApiProperty(record).owner.response_time_minutes, null);
  record.owner.responseTimeMinutes = 45;
  assert.equal(fromApiProperty(record).owner.response_time_minutes, 45);
});

test("CRM shows real listing data and labels browser preferences without invented analytics", async () => {
  const crm = await readFile(new URL("../components/dashboard/property-crm.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(crm, /430\s*\+\s*index|tx\("Views"/);
  assert.match(crm, /Workspace preferences saved on this browser/);
  assert.match(crm, /STORAGE_KEYS.ownerSettings/);
  assert.match(crm, /Notification delivery and weekly reports cannot be configured here/);
});

test("Myanmar viewing slots preserve their actual instant across device timezones", async () => {
  const { viewingTimeIso } = await load("lib/viewing-dates.ts");
  assert.equal(viewingTimeIso("2026-10-12", "10:30 AM"), "2026-10-12T04:00:00.000Z");
  assert.equal(viewingTimeIso("2026-10-12", "12:00 AM"), "2026-10-11T17:30:00.000Z");
  assert.equal(viewingTimeIso("2026-10-12", "12:00 PM"), "2026-10-12T05:30:00.000Z");
  assert.throws(() => viewingTimeIso("2026-10-12", "25:00 PM"), /Invalid viewing/);
});
