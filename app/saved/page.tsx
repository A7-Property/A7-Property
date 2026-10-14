import type { Metadata } from "next";

import { SavedJourney } from "@/components/mobile/saved-journey";
import { RequireAuth } from "@/components/auth/require-auth";
import { getAllProperties } from "@/lib/property-source";

export const metadata: Metadata = {
  title: "Saved homes | A7 Property",
  description: "Your personal shortlist, saved searches, price alerts, and recommendations.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Saved Homes | A7 Property",
    description: "Revisit the homes you love on A7 Property.",
    images: [{ url: "/og-saved-homes.png", width: 1731, height: 909, alt: "A7 Property Saved Homes" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Saved Homes | A7 Property",
    description: "Revisit the homes you love on A7 Property.",
    images: ["/og-saved-homes.png"],
  },
};

export default async function SavedPage() {
  return <RequireAuth requireRole="seeker"><SavedJourney properties={await getAllProperties()} /></RequireAuth>;
}
