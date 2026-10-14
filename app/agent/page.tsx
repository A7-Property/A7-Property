import type { Metadata } from "next";

import { RequireAuth } from "@/components/auth/require-auth";
import { ListerAccessNotice } from "@/components/auth/lister-access-notice";
import { PropertyCRM } from "@/components/dashboard/property-crm";
import { getAllProperties } from "@/lib/property-source";

export const metadata: Metadata = { title: "Agent workspace | A7 Property", description: "Professional Myanmar property CRM for inventory, leads, analytics and verification.", robots: { index: false, follow: false } };

export default async function AgentPage() {
  return (
    <RequireAuth requireRole="lister" roleMismatchFallback={<ListerAccessNotice />}>
      <PropertyCRM role="agent" properties={await getAllProperties()} />
    </RequireAuth>
  );
}
