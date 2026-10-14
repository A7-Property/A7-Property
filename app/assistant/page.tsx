import type { Metadata } from "next";

import { PropertyConsultant } from "@/components/assistant/property-consultant";
import { getAllProperties } from "@/lib/property-source";

export const metadata: Metadata = { title: "Home matching demo | A7 Property", description: "Try a browser-based property matching demo that filters and ranks the A7 sample listings." };

export default async function AssistantPage() { return <PropertyConsultant properties={await getAllProperties()} />; }
