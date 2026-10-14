import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";

import { ResetPasswordView } from "@/components/auth/reset-password-view";

export const metadata: Metadata = {
  title: "Set a new password | A7 Property",
  description: "Choose a new password for your A7 Property account.",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage() {
  if (process.env.CAPACITOR_BUILD !== "1") await connection();
  return (
    <Suspense fallback={null}>
      <ResetPasswordView />
    </Suspense>
  );
}
