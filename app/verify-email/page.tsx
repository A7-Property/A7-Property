import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";

import { VerifyEmailView } from "@/components/auth/verify-email-view";

export const metadata: Metadata = {
  title: "Verify your email | A7 Property",
  description: "Confirm your A7 Property email address.",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage() {
  if (process.env.CAPACITOR_BUILD !== "1") await connection();
  // The view reads ?token= with useSearchParams, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <VerifyEmailView />
    </Suspense>
  );
}
