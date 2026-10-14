"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { AuthTokenShell, type AuthFlowState } from "@/components/auth/auth-token-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import * as authApi from "@/lib/api/auth";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Outcome = { state: Exclude<AuthFlowState, "idle">; message: string } | null;

/**
 * Lands the `?token=` link from the verification email. The token is single-use
 * and expires in 24 hours, so this screen also offers to send a fresh one.
 */
function VerifyEmailView() {
  const { tx } = useLanguage();
  const { mode, refreshUser, user } = useAuth();
  const token = useSearchParams().get("token");
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [email, setEmail] = useState("");
  const [resendError, setResendError] = useState("");
  const [resendState, setResendState] = useState<AuthFlowState>("idle");
  // Tokens are single-use, and React can run an effect twice in development. A
  // second request would consume the token and report a false failure.
  const attempted = useRef(false);

  // Derived during render rather than written from an effect, so the screen is
  // correct on its first paint.
  const blocked = mode !== "server"
    ? tx(
      "This build has no API configured, so email verification cannot run here.",
      "ဤ build တွင် API မသတ်မှတ်ထားသဖြင့် အီးမေးလ်အတည်ပြုမှုကို ဤနေရာတွင် မလုပ်ဆောင်နိုင်ပါ။",
    )
    : !token
      ? tx("This link is missing its verification token.", "ဤလင့်ခ်တွင် အတည်ပြုကုဒ် ပါဝင်မနေပါ။")
      : null;

  useEffect(() => {
    if (blocked || !token || attempted.current) return;
    attempted.current = true;

    void (async () => {
      try {
        await authApi.verifyEmail(token);
        await refreshUser();
        setOutcome({
          state: "done",
          message: tx(
            "Your email is confirmed. You can now publish listings, send inquiries and request viewings.",
            "သင့်အီးမေးလ်ကို အတည်ပြုပြီးပါပြီ။ ယခု ကြော်ငြာတင်ခြင်း၊ စုံစမ်းမေးမြန်းခြင်းနှင့် အိမ်လာကြည့်ရန် တောင်းဆိုခြင်း ပြုလုပ်နိုင်ပါပြီ။",
          ),
        });
      } catch (error) {
        setOutcome({
          state: "error",
          message: error instanceof ApiError && error.status === 400
            ? tx("This link has already been used or has expired. Request a new one below.", "ဤလင့်ခ်ကို အသုံးပြုပြီးသား သို့မဟုတ် သက်တမ်းကုန်သွားပါပြီ။ အောက်တွင် အသစ်တောင်းဆိုပါ။")
            : tx("Your email could not be confirmed. Please try again.", "သင့်အီးမေးလ်ကို အတည်ပြုနိုင်ခြင်း မရှိပါ။ ထပ်မံကြိုးစားပါ။"),
        });
      }
    })();
  }, [blocked, token, refreshUser, tx]);

  const state: AuthFlowState = blocked ? "error" : outcome?.state ?? "working";
  const message = blocked
    ?? outcome?.message
    ?? tx("Confirming your email…", "သင့်အီးမေးလ်ကို အတည်ပြုနေပါသည်…");

  async function handleResend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = (email || user?.email || "").trim();
    if (resendState === "working" || mode !== "server") return;
    if (!emailPattern.test(address)) {
      setResendError(tx("Enter a valid email address.", "မှန်ကန်သော အီးမေးလ်လိပ်စာ ထည့်ပါ။"));
      setResendState("error");
      return;
    }
    setResendState("working");
    try {
      await authApi.resendVerification(address);
      setResendState("done");
    } catch {
      setResendState("error");
      setResendError(tx("The request could not be sent. Please try again.", "တောင်းဆိုမှုကို ပေးပို့မရပါ။ ထပ်မံကြိုးစားပါ။"));
    }
  }

  return (
    <AuthTokenShell
      title={tx("Verify your email", "အီးမေးလ် အတည်ပြုခြင်း")}
      description={tx("Confirming your address unlocks publishing, inquiries and viewing requests.", "လိပ်စာအတည်ပြုပြီးပါက ကြော်ငြာတင်ခြင်း၊ စုံစမ်းမေးမြန်းခြင်းနှင့် အိမ်လာကြည့်ရန် တောင်းဆိုခြင်းများ ပြုလုပ်နိုင်ပါမည်။")}
      state={state}
      message={message}
      footer={
        <>
          <Link href="/sign-in" className="inline-flex min-h-11 items-center font-semibold text-[#123B73] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#123B73]/20">
            {tx("Back to sign in", "အကောင့်ဝင်ရန် ပြန်သွားမည်")}
          </Link>
          {state === "done" ? (
            <Link href="/dashboard" className="inline-flex min-h-11 items-center font-semibold text-[#123B73] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#123B73]/20">
              {tx("Go to your dashboard", "ဒက်ရှ်ဘုတ်သို့သွားရန်")}
            </Link>
          ) : null}
        </>
      }
    >
      {mode === "server" && state === "error" ? (
        <form onSubmit={handleResend} noValidate className="space-y-3">
          <label htmlFor="verify-resend-email" className="block text-[13px] font-semibold text-[#344054]">
            {tx("Send a new verification link to", "အတည်ပြုလင့်ခ်အသစ် ပေးပို့မည့်လိပ်စာ")}
          </label>
          <input
            id="verify-resend-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email || user?.email || ""}
            onChange={(event) => { setEmail(event.target.value); setResendState("idle"); }}
            aria-invalid={resendState === "error"}
            className="h-11 w-full rounded-[var(--radius-control)] border border-[#DCE2EA] bg-white px-3.5 text-[15px] text-[#101828] outline-none focus-visible:ring-4 focus-visible:ring-[#123B73]/20"
            placeholder={tx("Enter your email", "သင့်အီးမေးလ်ကို ထည့်ပါ")}
          />
          {resendState === "error" ? (
            <p role="alert" className="text-[13px] text-[#9A2A2A]">{resendError}</p>
          ) : null}
          {resendState === "done" ? (
            <p role="status" aria-live="polite" className="text-[13px] text-[#13603C]">
              {tx("If that address needs verifying, a new link is on its way.", "ထိုလိပ်စာအတည်ပြုရန် လိုအပ်ပါက လင့်ခ်အသစ်ကို ပေးပို့လိုက်ပါပြီ။")}
            </p>
          ) : null}
          <Button type="submit" disabled={resendState === "working"}>
            {tx("Send a new link", "လင့်ခ်အသစ် ပေးပို့မည်")}
          </Button>
        </form>
      ) : null}
    </AuthTokenShell>
  );
}

export { VerifyEmailView };
