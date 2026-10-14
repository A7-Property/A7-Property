import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { PropertyDetailView } from "@/components/property/property-detail-view";
import { getPropertyById, getPropertyIds, isServerBacked } from "@/lib/property-source";
import { formatPropertyPrice, listingVerificationLabel } from "@/lib/properties";
import { absoluteSiteUrl } from "@/lib/site";

type RouteProps = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  // In server mode this returns an empty list when the API is unreachable at
  // build time, and those pages are then rendered on demand instead.
  return (await getPropertyIds()).map((id) => ({ id }));
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  if (isServerBacked() && process.env.CAPACITOR_BUILD !== "1") await connection();
  const { id } = await params;
  const property = await getPropertyById(id);
  if (!property) return { title: "Property not found | A7 Property" };
  const title = `${property.title} | A7 Property`;
  const verification = listingVerificationLabel(property);
  const description = `${formatPropertyPrice(property)} · ${property.bedrooms} bedrooms · ${property.area_sqft} sqft in ${property.township}, ${property.city}. ${verification}.`;
  const image = absoluteSiteUrl(property.images[0]);
  return {
    title,
    description,
    alternates: { canonical: absoluteSiteUrl(`/properties/${property.id}`) },
    openGraph: { title, description, images: [{ url: image, alt: property.title }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function PropertyDetailPage({ params }: RouteProps) {
  if (isServerBacked() && process.env.CAPACITOR_BUILD !== "1") await connection();
  const { id } = await params;
  const property = await getPropertyById(id);
  if (!property) notFound();
  return <PropertyDetailView property={property} />;
}
