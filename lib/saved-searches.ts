import { readStoredJson, STORAGE_KEYS, writeStoredJson } from "@/lib/local-storage";

interface SavedSearchRecord {
  id: string;
  title: string;
  detail: string;
  count: number;
  href: string;
  notificationsEnabled: boolean;
  createdAt: string;
}

const defaultSavedSearches: SavedSearchRecord[] = [
  { id: "hledan", title: "Hledan · 2 bedroom condos", detail: "Up to 800,000 MMK · Furnished", count: 8, href: "/search?purpose=rent&location=Hledan&max=800000&beds=2&type=condo", notificationsEnabled: true, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "yankin", title: "Quiet homes in Yankin", detail: "1+ bedroom · Verified only", count: 5, href: "/search?purpose=rent&location=Yankin&beds=1&verified=1", notificationsEnabled: false, createdAt: "2026-01-02T00:00:00.000Z" },
];

function readSavedSearches() {
  return readStoredJson<SavedSearchRecord[]>(STORAGE_KEYS.savedSearches, defaultSavedSearches);
}

function upsertSavedSearch(record: SavedSearchRecord) {
  const current = readSavedSearches();
  const signature = record.href.split("#")[0];
  const next = [record, ...current.filter((item) => item.href.split("#")[0] !== signature && item.id !== record.id)].slice(0, 12);
  writeStoredJson(STORAGE_KEYS.savedSearches, next);
  return next;
}

function updateSavedSearchNotifications(id: string, enabled: boolean) {
  const next = readSavedSearches().map((item) => item.id === id ? { ...item, notificationsEnabled: enabled } : item);
  writeStoredJson(STORAGE_KEYS.savedSearches, next);
  return next;
}

export { defaultSavedSearches, readSavedSearches, updateSavedSearchNotifications, upsertSavedSearch };
export type { SavedSearchRecord };
