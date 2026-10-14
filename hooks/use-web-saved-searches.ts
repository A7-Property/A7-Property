"use client";

import { useCallback, useEffect, useState } from "react";
import { readStoredJson, STORAGE_KEYS, writeStoredJson } from "@/lib/local-storage";
import type { SavedSearchRecord } from "@/lib/saved-searches";

function read() {
  const records = readStoredJson<unknown>(STORAGE_KEYS.savedSearches, []);
  return Array.isArray(records) ? records.filter((item): item is SavedSearchRecord => Boolean(item && typeof item.id === "string" && typeof item.title === "string" && typeof item.href === "string" && item.href.startsWith("/search?"))) : [];
}

/** Browser-local bookmarks only. Never seeds searches or claims to send alerts. */
export function useWebSavedSearches() {
  const [searches, setSearches] = useState<SavedSearchRecord[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    function sync() { setSearches(read()); setReady(true); }
    queueMicrotask(sync);
    function changed(event: Event) {
      if ((event as CustomEvent<{ key: string }>).detail?.key === STORAGE_KEYS.savedSearches) sync();
    }
    function stored(event: StorageEvent) { if (event.key === STORAGE_KEYS.savedSearches || event.key === null) sync(); }
    window.addEventListener("a7:stored-json-change", changed);
    window.addEventListener("storage", stored);
    return () => { window.removeEventListener("a7:stored-json-change", changed); window.removeEventListener("storage", stored); };
  }, []);
  const save = useCallback((record: SavedSearchRecord) => {
    const next = [record, ...read().filter((item) => item.href !== record.href && item.id !== record.id)].slice(0, 12);
    writeStoredJson(STORAGE_KEYS.savedSearches, next);
  }, []);
  const remove = useCallback((id: string) => { writeStoredJson(STORAGE_KEYS.savedSearches, read().filter((item) => item.id !== id)); }, []);
  return { searches, ready, save, remove };
}
