import type { Metadata } from "next";

import { AdminSignInView } from "@/components/auth/admin-sign-in-view";

export const metadata: Metadata = {
  title: "Admin Sign In - A7 Property",
  robots: { index: false, follow: false },
};

export default function AdminSignInPage() {
  return <AdminSignInView />;
}
