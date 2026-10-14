import type { Metadata } from "next";
import { Suspense } from "react";

import { MobilePropertySearch } from "@/components/mobile/mobile-property-search";
import { ResponsiveSearch } from "@/components/web/responsive-marketplace";
import { getAllProperties, getPropertySearch } from "@/lib/property-source";
import { parseWebSearch, webApiFilters, webSearchParams } from "@/lib/web-search";

export const metadata: Metadata = {
  title: "Explore homes in Myanmar | A7 Property",
  description: "Explore property listings across Myanmar by location, price, verification status, and property type.",
  openGraph: {
    title: "Explore Homes | A7 Property",
    description: "Explore property listings across Myanmar by location, price, verification status, and property type.",
    images: [{ url: "/og-explore-homes.png", width: 1734, height: 907, alt: "A7 Property Explore Homes" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Explore Homes | A7 Property",
    description: "Explore property listings across Myanmar by location, price, verification status, and property type.",
    images: ["/og-explore-homes.png"],
  },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Preserve the original exportable mobile application path and its state.
  if (process.env.CAPACITOR_BUILD === "1") {
    const properties = await getAllProperties();
    return <Suspense fallback={<div className="min-h-screen bg-[#F9F7FF]" />}><MobilePropertySearch properties={properties} /></Suspense>;
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (value !== undefined) params.set(key, Array.isArray(value) ? value[0] : value);
  }
  const state = parseWebSearch(params);
  const [properties, initial] = await Promise.all([getAllProperties(), getPropertySearch(webApiFilters(state))]);
  return <Suspense fallback={<div className="min-h-screen bg-white" role="status">Loading properties…</div>}><ResponsiveSearch properties={properties} initial={initial} initialQuery={webSearchParams(state).toString()} /></Suspense>;
}
