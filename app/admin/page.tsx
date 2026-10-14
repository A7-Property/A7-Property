import type { Metadata } from "next";

import { RequireAuth } from "@/components/auth/require-auth";
import { AdminDashboard } from "@/components/dashboard/admin/admin-dashboard";

export const metadata: Metadata = {
  title: "Admin Dashboard - A7 Property",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <RequireAuth requireRole="admin">
      <AdminDashboard />
    </RequireAuth>
  );
}
