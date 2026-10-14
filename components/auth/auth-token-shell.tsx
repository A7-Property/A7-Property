"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { A7Brand } from "@/components/brand/a7-brand";
import { useLanguage } from "@/components/i18n/language-provider";

export type AuthFlowState = "idle" | "working" | "done" | "error";

/**
 * Shared frame for the email-link screens (verify, reset, forgot). The backend's
 * transactional emails point at these routes, so they have to exist and work in
 * both languages even before the rest of the UI is server-backed.
 */
function AuthTokenShell({
  title,
  description,
  state,
  message,
  children,
  footer,
}: {
  title: string;
  description: string;
  state: AuthFlowState;
  message?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const { tx } = useLanguage();
  const tone = state === "error"
    ? "border-[#F3B9B9] bg-[#FEF3F2] text-[#9A2A2A]"
    : state === "done"
      ? "border-[#A9DCC0] bg-[#EFFBF4] text-[#13603C]"
      : "border-[#B9D8FF] bg-[#EEF6FF] text-[#244B76]";

  return (
    <main id="main-content" className="flex min-h-svh flex-col bg-[#F8FBFF] px-5 py-8 sm:px-8">
      <Link href="/" className="self-start rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#123B73]/20" aria-label={tx("Back to home", "ပင်မစာမျက်နှာသို့")}>
        <A7Brand />
      </Link>

      <div className="mx-auto my-auto w-full max-w-[460px] rounded-[24px] border border-[#E3E8EF] bg-white p-6 shadow-[0_18px_60px_rgba(16,35,61,.08)] sm:p-8">
        <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[#101828] sm:text-[30px]">{title}</h1>
        <p className="mt-2.5 text-[15px] leading-6 text-[#687385]">{description}</p>

        {message ? (
          <p role={state === "error" ? "alert" : "status"} aria-live="polite" className={`mt-5 rounded-xl border px-4 py-3 text-[13px] leading-5 ${tone}`}>
            {state === "working" ? <Loader2 className="mr-2 inline size-4 animate-spin align-[-2px]" aria-hidden="true" /> : null}
            {message}
          </p>
        ) : null}

        {children ? <div className="mt-6">{children}</div> : null}

        <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
          {footer ?? (
            <Link href="/sign-in" className="inline-flex min-h-11 items-center font-semibold text-[#123B73] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#123B73]/20">
              {tx("Back to sign in", "အကောင့်ဝင်ရန် ပြန်သွားမည်")}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

export { AuthTokenShell };
