"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { isApiConfigured } from "@/lib/api/client";
import * as savedSearchesApi from "@/lib/api/saved-searches";
import { readStoredJson, STORAGE_KEYS, writeStoredJson } from "@/lib/local-storage";
import type { SavedSearchRecord } from "@/lib/saved-searches";

function read() {
  const records = readStoredJson<unknown>(STORAGE_KEYS.savedSearches, []);
  return Array.isArray(records) ? records.filter((item): item is SavedSearchRecord => Boolean(item && typeof item.id === "string" && typeof item.title === "string" && typeof item.href === "string" && item.href.startsWith("/search?"))) : [];
}

/** Browser-local bookmarks only. Never seeds searches or claims to send alerts. */
export function useWebSavedSearches() {
  const serverBacked = isApiConfigured();
  const { status } = useAuth();
  const syncedToAccount = serverBacked && status === "authenticated";
  const [searches, setSearches] = useState<SavedSearchRecord[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    function sync() { setSearches(read()); setReady(true); }
    if (serverBacked && status === "loading") return;
    if (syncedToAccount) {
      let cancelled = false;
      void savedSearchesApi.listSavedSearches().then((records) => {
        if (!cancelled) setSearches(records.map((record) => ({ ...record, count: 0 })));
      }).catch(() => { if (!cancelled) setSearches([]); }).finally(() => { if (!cancelled) setReady(true); });
      return () => { cancelled = true; };
    }
    queueMicrotask(sync);
    function changed(event: Event) {
      if ((event as CustomEvent<{ key: string }>).detail?.key === STORAGE_KEYS.savedSearches) sync();
    }
    function stored(event: StorageEvent) { if (event.key === STORAGE_KEYS.savedSearches || event.key === null) sync(); }
    window.addEventListener("a7:stored-json-change", changed);
    window.addEventListener("storage", stored);
    return () => { window.removeEventListener("a7:stored-json-change", changed); window.removeEventListener("storage", stored); };
  }, [serverBacked, status, syncedToAccount]);
  const save = useCallback((record: SavedSearchRecord) => {
    if (syncedToAccount) {
      const params = Object.fromEntries(new URLSearchParams(record.href.split("?")[1] ?? ""));
      void savedSearchesApi.createSavedSearch({ ...record, filters: params }).then((saved) => {
        setSearches((current) => [{ ...saved, count: record.count }, ...current.filter((item) => item.id !== saved.id && item.href !== saved.href)].slice(0, 12));
      });
      return;
    }
    const next = [record, ...read().filter((item) => item.href !== record.href && item.id !== record.id)].slice(0, 12);
    writeStoredJson(STORAGE_KEYS.savedSearches, next);
  }, [syncedToAccount]);
  const remove = useCallback((id: string) => {
    if (syncedToAccount) { void savedSearchesApi.deleteSavedSearch(id).then(() => setSearches((current) => current.filter((item) => item.id !== id))); return; }
    writeStoredJson(STORAGE_KEYS.savedSearches, read().filter((item) => item.id !== id));
  }, [syncedToAccount]);
  return { searches, ready, save, remove, serverBacked: syncedToAccount };
}
