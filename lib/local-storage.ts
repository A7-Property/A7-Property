const STORAGE_KEYS = {
  saved: "a7-property-saved-homes",
  savedSearches: "a7-property-saved-searches",
  compare: "a7-property-compare-homes",
  recent: "a7-property-recent-homes",
  conversations: "a7-property-conversations",
  viewings: "a7-property-viewings",
  profile: "a7-property-profile",
  preferences: "a7-property-preferences",
  profileSettings: "a7-property-profile-settings",
  crmDrafts: "a7-property-crm-drafts",
  ownerSettings: "a7-property-owner-settings",
  agentSettings: "a7-property-agent-settings",
  language: "a7-property-language",
  legacySaved: "eain-saved-homes",
  legacyRecent: "eain-recent-properties",
} as const;

const memoryStorage = new Map<string, string>();

function getStoredValue(key: string) {
  if (typeof window !== "undefined") {
    try {
      const value = window.localStorage?.getItem(key);
      if (value !== null && value !== undefined) return value;
    } catch {
      // Some embedded or privacy-restricted browsers disable localStorage.
    }
  }
  return memoryStorage.get(key) ?? null;
}

function readStoredIds(key: string, legacyKey?: string, fallback: string[] = []) {
  try {
    const value = getStoredValue(key) ?? (legacyKey ? getStoredValue(legacyKey) : null);
    if (value === null) return [...fallback];
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [...fallback];
    return [...new Set(parsed.filter((id): id is string => typeof id === "string"))];
  } catch {
    return [...fallback];
  }
}

function writeStoredIds(key: string, ids: string[]) {
  const normalized = [...new Set(ids)];
  const value = JSON.stringify(normalized);
  memoryStorage.set(key, value);

  if (typeof window !== "undefined") {
    try {
      window.localStorage?.setItem(key, value);
    } catch {
      // The in-memory copy keeps navigation working when storage is unavailable.
    }
    window.dispatchEvent(new CustomEvent("a7:stored-ids-change", { detail: { key, ids: normalized } }));
  }
}

function readStoredJson<T>(key: string, fallback: T): T {
  try {
    const value = getStoredValue(key);
    if (value === null) return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function readStoredString(key: string, fallback: string | null = null) {
  return getStoredValue(key) ?? fallback;
}

function writeStoredJson<T>(key: string, value: T) {
  const serialized = JSON.stringify(value);
  memoryStorage.set(key, serialized);

  if (typeof window !== "undefined") {
    try {
      window.localStorage?.setItem(key, serialized);
    } catch {
      // The in-memory copy keeps the current session usable when storage is unavailable.
    }
    window.dispatchEvent(new CustomEvent("a7:stored-json-change", { detail: { key, value } }));
  }
}

function writeStoredString(key: string, value: string) {
  memoryStorage.set(key, value);

  if (typeof window !== "undefined") {
    try {
      window.localStorage?.setItem(key, value);
    } catch {
      // The in-memory copy keeps the current session usable when storage is unavailable.
    }
    window.dispatchEvent(new CustomEvent("a7:stored-string-change", { detail: { key, value } }));
  }
}

function removeStoredValue(key: string) {
  memoryStorage.delete(key);

  if (typeof window !== "undefined") {
    try {
      window.localStorage?.removeItem(key);
    } catch {
      // Removing the in-memory value is enough for this restricted session.
    }
    window.dispatchEvent(new CustomEvent("a7:stored-value-remove", { detail: { key } }));
  }
}

export { readStoredIds, readStoredJson, readStoredString, removeStoredValue, STORAGE_KEYS, writeStoredIds, writeStoredJson, writeStoredString };
