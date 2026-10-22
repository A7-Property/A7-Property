import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { ConfirmEmailChangeView } from "@/components/auth/confirm-email-change-view";

export const metadata: Metadata = { title: "Confirm email change | A7 Property", description: "Confirm a new A7 Property account email.", robots: { index: false, follow: false } };

export default async function ConfirmEmailChangePage() {
  if (process.env.CAPACITOR_BUILD !== "1") await connection();
  return <Suspense fallback={null}><ConfirmEmailChangeView /></Suspense>;
}
