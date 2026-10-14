import type { Metadata } from "next";

import { ForgotPasswordView } from "@/components/auth/forgot-password-view";

export const metadata: Metadata = {
  title: "Reset your password | A7 Property",
  description: "Request a secure password reset link for your A7 Property account.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordView />;
}
