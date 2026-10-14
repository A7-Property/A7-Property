"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Mail, LockKeyhole, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";

export function AdminSignInView() {
  const router = useRouter();
  const { signInWithPassword, signOut } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSubmitting(true);

    try {
      const user = await signInWithPassword(email.trim(), password);

      // Enforce that only admins can use this portal
      if (user.accountType !== "admin") {
        signOut();
        setErrorMessage("Access denied. This portal is for administrators only.");
        setSubmitting(false);
        return;
      }

      router.push("/admin");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) setErrorMessage("Incorrect email or password.");
        else if (error.status === 403) setErrorMessage("Too many failed attempts. Please wait.");
        else setErrorMessage("Something went wrong. Please try again.");
      } else {
        setErrorMessage("A network error occurred.");
      }
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-svh bg-[#0B1321] flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex justify-center mb-6">
            <div className="size-14 rounded-2xl bg-[#EEF2F6] flex items-center justify-center text-[#123B73]">
              <ShieldCheck className="size-8" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#101828]">Admin Portal</h1>
            <p className="text-sm text-[#667085] mt-2">Sign in to manage A7 Property</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#101828] mb-1.5">Email address</label>
              <div className="flex h-[50px] items-center gap-3 rounded-xl border border-[#CCD4DE] bg-[#F8FBFF] px-4 focus-within:border-[#123B73] focus-within:shadow-[0_0_0_3px_rgba(18,59,115,.12)]">
                <Mail className="size-5 text-[#7B8798]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@a7property.com"
                  className="flex-1 bg-transparent text-[15px] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#101828] mb-1.5">Password</label>
              <div className="flex h-[50px] items-center gap-3 rounded-xl border border-[#CCD4DE] bg-[#F8FBFF] px-4 focus-within:border-[#123B73] focus-within:shadow-[0_0_0_3px_rgba(18,59,115,.12)]">
                <LockKeyhole className="size-5 text-[#7B8798]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-transparent text-[15px] outline-none"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-[#F3B9B9] bg-[#FEF3F2] px-4 py-3 text-xs leading-5 text-[#9A2A2A]">
                {errorMessage}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full h-[50px] rounded-xl text-[15px] mt-2"
            >
              {submitting ? <Loader2 className="size-[18px] animate-spin" /> : "Secure Sign In"}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#667085] hover:text-[#101828]">
              <ArrowLeft className="size-4" /> Return to main site
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
