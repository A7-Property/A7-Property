import type { Metadata } from "next";

import { RequireAuth } from "@/components/auth/require-auth";
import { ListerAccessNotice } from "@/components/auth/lister-access-notice";
import { PropertyCRM } from "@/components/dashboard/property-crm";
import { getAllProperties } from "@/lib/property-source";

export const metadata: Metadata = { title: "Owner dashboard | A7 Property", description: "Manage property listings, inquiries, pricing, analytics and verification.", robots: { index: false, follow: false } };

export default async function OwnerPage() {
  return (
    <RequireAuth requireRole="lister" roleMismatchFallback={<ListerAccessNotice />}>
      <PropertyCRM role="owner" properties={await getAllProperties()} />
    </RequireAuth>
  );
}
