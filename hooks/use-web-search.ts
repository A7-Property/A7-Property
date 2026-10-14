"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isApiConfigured } from "@/lib/api/client";
import { listProperties } from "@/lib/api/properties";
import { fromApiProperty } from "@/lib/api/property-adapter";
import type { Property } from "@/lib/properties";
import { parseWebSearch, webApiFilters, webSearchParams, type WebSearchState } from "@/lib/web-search";

export interface WebSearchPage { properties: Property[]; total: number; totalPages: number; unavailable: boolean }

export function useWebSearch(initial: WebSearchPage, initialQuery: string) {
  const params = useSearchParams();
  const state = parseWebSearch(params);
  const query = webSearchParams(state).toString();
  const [response, setResponse] = useState({ query: initialQuery, page: initial });
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const serverBacked = isApiConfigured();
  useEffect(() => {
    if (!serverBacked || (query === initialQuery && retry === 0)) return;
    let active = true;
    queueMicrotask(() => { if (active) setPendingQuery(query); });
    function unavailable() {
      if (!active) return;
      setResponse({ query, page: { properties: [], total: 0, totalPages: 0, unavailable: true } });
      setPendingQuery(null);
    }
    // A stalled public read must leave the skeleton and offer a retry. Keep
    // this deadline local to desktop search; session/refresh transport is shared.
    const deadline = window.setTimeout(() => { unavailable(); active = false; }, 15_000);
    const filters = webApiFilters(parseWebSearch(new URLSearchParams(query)));
    listProperties(filters).then((result) => {
      if (active) setResponse({ query, page: { properties: result.data.map(fromApiProperty), total: result.meta.total, totalPages: result.meta.totalPages, unavailable: false } });
    }).catch(unavailable).finally(() => { window.clearTimeout(deadline); if (active) setPendingQuery(null); });
    return () => { active = false; window.clearTimeout(deadline); };
  }, [query, initialQuery, retry, serverBacked]);

  const page = query === initialQuery && retry === 0 ? initial : response.query === query ? response.page : { properties: [], total: 0, totalPages: 0, unavailable: false };
  const loading = serverBacked && (pendingQuery === query || (query !== initialQuery && response.query !== query));
  function update(patch: Partial<WebSearchState>) {
    const next = { ...state, ...patch, page: patch.page ?? 1 };
    window.history.pushState(null, "", `/search?${webSearchParams(next)}`);
  }
  return { state, page, loading, update, retry: () => setRetry((value) => value + 1) };
}
