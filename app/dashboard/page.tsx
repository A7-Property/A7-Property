import type { Metadata } from "next";

import { RequireAuth } from "@/components/auth/require-auth";
import { UserDashboard } from "@/components/dashboard/user-dashboard";
import { getAllProperties } from "@/lib/property-source";

export const metadata: Metadata = { title: "My saved homes | A7 Property", description: "Keep your favorite homes, owner conversations, price alerts, and upcoming viewings together.", robots: { index: false, follow: false } };

export default async function DashboardPage() {
  return (
    <RequireAuth requireRole="seeker">
      <UserDashboard properties={await getAllProperties()} />
    </RequireAuth>
  );
}
