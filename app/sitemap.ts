import type { MetadataRoute } from "next";

import { getPropertyIds } from "@/lib/property-source";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const coreRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/assistant`, changeFrequency: "monthly", priority: 0.7 },
  ];

  // Verification state is per-listing and changes under review, so the sitemap
  // keeps a single priority rather than restating a trust claim that may be stale.
  return [
    ...coreRoutes,
    ...(await getPropertyIds()).map((id) => ({
      url: `${SITE_URL}/properties/${id}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
