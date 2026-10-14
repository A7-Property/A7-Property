import type { Metadata } from "next";

import { PropertyComparison } from "@/components/compare/property-comparison";
import { getAllProperties } from "@/lib/property-source";

export const metadata: Metadata = {
  title: "Compare homes | A7 Property",
  description: "Compare Myanmar property listings side by side by price, space, features, and verification status.",
  robots: { index: false, follow: false },
};

export default async function ComparePage() {
  return <PropertyComparison properties={await getAllProperties()} />;
}
