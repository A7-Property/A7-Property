import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";

import { SignInView } from "@/components/auth/sign-in-view";

export const metadata: Metadata = {
  title: "Sign in | A7 Property",
  description: "Sign in to continue your A7 Property home search.",
  robots: { index: false, follow: false },
};

export default async function SignInPage() {
  if (process.env.CAPACITOR_BUILD !== "1") await connection();
  return <Suspense fallback={null}><SignInView /></Suspense>;
}
