import { HomeDiscovery } from "@/components/mobile/home-discovery";
import { ResponsiveHome } from "@/components/web/responsive-marketplace";
import { getAllProperties, isServerBacked } from "@/lib/property-source";
import { connection } from "next/server";
import { sortProperties, type Property } from "@/lib/properties";

export default async function HomePage() {
  if (isServerBacked() && process.env.CAPACITOR_BUILD !== "1") await connection();
  const properties = await getAllProperties();
  const recommendedByPurpose = {
    rent: getRecommendations(properties, "rent"),
    sale: getRecommendations(properties, "sale"),
  };
  const locationCounts = Object.fromEntries(
    ["Yangon", "Mandalay", "Bahan"].map((location) => [
      location,
      properties.filter((property) => property.city === location || property.township === location).length,
    ]),
  );

  const mobile = { recommendedByPurpose, locationCounts };
  // Capacitor retains the existing application screens at every viewport.
  if (process.env.CAPACITOR_BUILD === "1") return <HomeDiscovery {...mobile} />;
  const web = {
    recommended: sortProperties(properties, "recommended").slice(0, 4),
    featured: properties.filter((property) => property.verification_status === "verified").slice(0, 4),
    recent: [...properties].sort((a, b) => Date.parse(b.posted_at) - Date.parse(a.posted_at)).slice(0, 4),
  };
  return <ResponsiveHome mobile={mobile} web={web} />;
}

function getRecommendations(properties: Property[], purpose: Property["purpose"]) {
  return sortProperties(
    properties.filter((property) => property.purpose === purpose && property.verification_status === "verified"),
    "recommended",
  ).slice(0, 4);
}
