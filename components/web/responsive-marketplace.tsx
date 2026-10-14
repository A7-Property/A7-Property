"use client";

import { useSyncExternalStore } from "react";
import { HomeDiscovery } from "@/components/mobile/home-discovery";
import { MobilePropertySearch } from "@/components/mobile/mobile-property-search";
import type { Property } from "@/lib/properties";
import type { WebSearchPage } from "@/hooks/use-web-search";
import { WebHome, type WebHomeProps } from "./web-home";
import { WebSearch } from "./web-search";

function subscribe(callback: () => void) {
  const query = window.matchMedia("(min-width: 1024px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function desktopSnapshot() { return window.matchMedia("(min-width: 1024px)").matches; }
function serverSnapshot() { return true; }

// Mount only the active view: hidden mobile controllers must not rewrite the
// desktop URL, and each viewport must have a single H1 and language switcher.
export function ResponsiveHome({ mobile, web }: { mobile: { recommendedByPurpose: Record<Property["purpose"], Property[]>; locationCounts: Record<string, number> }; web: WebHomeProps }) {
  const desktop = useSyncExternalStore(subscribe, desktopSnapshot, serverSnapshot);
  return desktop ? <WebHome {...web} /> : <HomeDiscovery {...mobile} />;
}

export function ResponsiveSearch({ properties, initial, initialQuery }: { properties: Property[]; initial: WebSearchPage; initialQuery: string }) {
  const desktop = useSyncExternalStore(subscribe, desktopSnapshot, serverSnapshot);
  return desktop ? <WebSearch initial={initial} initialQuery={initialQuery} /> : <MobilePropertySearch properties={properties} />;
}
