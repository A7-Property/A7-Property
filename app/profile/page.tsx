import type { Metadata } from "next";

import { ProfileExperience } from "@/components/mobile/profile-experience";
import { RequireAuth } from "@/components/auth/require-auth";

export const metadata: Metadata = {
  title: "My profile | A7 Property",
  description: "Manage your personal home journey, verification, preferences, saved searches, and account settings.",
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return <RequireAuth><ProfileExperience /></RequireAuth>;
}
