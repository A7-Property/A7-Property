import type { Metadata } from "next";
import { ListerDiscovery, type PublicLister } from "@/components/web/lister-discovery";
import { getAllProperties, isServerBacked } from "@/lib/property-source";
import { connection } from "next/server";

export const metadata: Metadata = { title: "Find a property lister | A7 Property", description: "Find owners and agents through their published Myanmar property listings." };

export default async function ListersPage() {
  if (isServerBacked() && process.env.CAPACITOR_BUILD !== "1") await connection();
  const properties = await getAllProperties();
  const listers = new Map<string, PublicLister>();
  for (const property of properties) {
    const lister = listers.get(property.owner.id) ?? { id: property.owner.id, name: property.owner.name, type: property.owner.type, listings: [] };
    lister.listings.push({ id: property.id, title: property.title, location: `${property.township}, ${property.city}` });
    listers.set(lister.id, lister);
  }
  return <ListerDiscovery listers={[...listers.values()]} />;
}
