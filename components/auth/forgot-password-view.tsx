"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { AuthTokenShell, type AuthFlowState } from "@/components/auth/auth-token-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import * as authApi from "@/lib/api/auth";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Requests a password reset link. The response is deliberately identical whether
 * or not the address has an account, so this screen must not imply either.
 */
function ForgotPasswordView() {
  const { tx } = useLanguage();
  const { mode } = useAuth();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<AuthFlowState>("idle");
  const [message, setMessage] = useState("");

  const unavailable = mode !== "server"
    ? tx(
      "This build has no API configured. No reset email can be sent from here.",
      "ဤ build တွင် API မသတ်မှတ်ထားပါ။ ဤနေရာမှ ပြန်သတ်မှတ်အီးမေးလ် ပေးပို့နိုင်မည် မဟုတ်ပါ။",
    )
    : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (unavailable) return;
    if (!emailPattern.test(email.trim())) {
      setState("error");
      setMessage(tx("Enter a valid email address.", "မှန်ကန်သော အီးမေးလ်လိပ်စာ ထည့်ပါ။"));
      return;
    }

    setState("working");
    setMessage(tx("Sending your reset link…", "ပြန်သတ်မှတ်လင့်ခ်ကို ပေးပို့နေပါသည်…"));
    try {
      await authApi.forgotPassword(email.trim());
      setState("done");
      setMessage(tx(
        "If an account uses that address, a reset link is on its way. It expires in 30 minutes.",
        "ထိုလိပ်စာကို အသုံးပြုသော အကောင့်ရှိပါက ပြန်သတ်မှတ်လင့်ခ်ကို ပေးပို့လိုက်ပါပြီ။ ၃၀ မိနစ်အတွင်း သက်တမ်းကုန်ပါမည်။",
      ));
    } catch (error) {
      setState("error");
      setMessage(error instanceof ApiError && error.isRateLimited
        ? tx("Too many requests. Please wait a minute and try again.", "တောင်းဆိုမှု အလွန်များပါသည်။ ခဏစောင့်ပြီး ထပ်မံကြိုးစားပါ။")
        : tx("Your request could not be sent. Please try again.", "သင့်တောင်းဆိုမှုကို ပေးပို့နိုင်ခြင်း မရှိပါ။ ထပ်မံကြိုးစားပါ။"));
    }
  }

  return (
    <AuthTokenShell
      title={tx("Reset your password", "စကားဝှက် ပြန်သတ်မှတ်ခြင်း")}
      description={tx("Enter the email address on your account and we will send a secure reset link.", "သင့်အကောင့်၏ အီးမေးလ်လိပ်စာကို ထည့်ပါ၊ လုံခြုံသော ပြန်သတ်မှတ်လင့်ခ်ကို ပေးပို့ပါမည်။")}
      state={unavailable ? "error" : state}
      message={unavailable ?? message}
      footer={
        <Link href="/sign-in" className="inline-flex min-h-11 items-center font-semibold text-[#123B73] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#123B73]/20">
          {tx("Back to sign in", "အကောင့်ဝင်ရန် ပြန်သွားမည်")}
        </Link>
      }
    >
      {unavailable || state === "done" ? null : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="forgot-email" className="block text-[13px] font-semibold text-[#344054]">
              {tx("Email address", "အီးမေးလ်လိပ်စာ")}
            </label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => { setEmail(event.target.value); if (state === "error") setState("idle"); }}
              aria-invalid={state === "error"}
              className="mt-1.5 h-11 w-full rounded-[var(--radius-control)] border border-[#DCE2EA] bg-white px-3.5 text-[15px] text-[#101828] outline-none focus-visible:ring-4 focus-visible:ring-[#123B73]/20"
              placeholder={tx("Enter your email", "သင့်အီးမေးလ်ကို ထည့်ပါ")}
            />
          </div>
          <Button type="submit" className="w-full" disabled={state === "working"}>
            {tx("Send reset link", "ပြန်သတ်မှတ်လင့်ခ် ပေးပို့မည်")}
          </Button>
        </form>
      )}
    </AuthTokenShell>
  );
}

export { ForgotPasswordView };
