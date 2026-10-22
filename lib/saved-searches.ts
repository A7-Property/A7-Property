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

const defaultSavedSearches: SavedSearchRecord[] = [];

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
