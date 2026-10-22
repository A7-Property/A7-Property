"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthTokenShell, type AuthFlowState } from "@/components/auth/auth-token-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { ApiError } from "@/lib/api/client";
import * as authApi from "@/lib/api/auth";

export function ConfirmEmailChangeView() {
  const { tx } = useLanguage();
  const { mode, signOut } = useAuth();
  const token = useSearchParams().get("token");
  const attempted = useRef(false);
  const [outcome, setOutcome] = useState<{ state: AuthFlowState; message: string } | null>(null);
  const blocked = mode !== "server" ? tx("This build has no API configured, so the email change cannot run here.", "ဤ build တွင် API မချိတ်ဆက်ထားသဖြင့် အီးမေးလ်ပြောင်း၍ မရပါ။") : !token ? tx("This link is missing its confirmation token.", "ဤလင့်ခ်တွင် အတည်ပြုကုဒ် မပါပါ။") : null;

  useEffect(() => {
    if (blocked || !token || attempted.current) return;
    attempted.current = true;
    void authApi.confirmEmailChange(token).then(() => {
      signOut();
      setOutcome({ state: "done", message: tx("Your email was changed. Sign in again with the new address.", "သင့်အီးမေးလ် ပြောင်းပြီးပါပြီ။ လိပ်စာအသစ်ဖြင့် ပြန်ဝင်ပါ။") });
    }).catch((error) => setOutcome({ state: "error", message: error instanceof ApiError ? error.message : tx("The email change could not be confirmed.", "အီးမေးလ်ပြောင်းခြင်းကို အတည်မပြုနိုင်ပါ။") }));
  }, [blocked, signOut, token, tx]);

  return <AuthTokenShell title={tx("Confirm your new email", "အီးမေးလ်အသစ် အတည်ပြုရန်")} description={tx("For security, confirmation signs every device out.", "လုံခြုံရေးအတွက် အတည်ပြုပြီးနောက် စက်အားလုံးမှ ထွက်ပါမည်။")} state={blocked ? "error" : outcome?.state ?? "working"} message={blocked ?? outcome?.message ?? tx("Confirming your new email…", "အီးမေးလ်အသစ်ကို အတည်ပြုနေသည်…")} footer={<Link href="/sign-in" className="inline-flex min-h-11 items-center font-semibold text-[#123B73] underline-offset-4 hover:underline">{tx("Go to sign in", "အကောင့်ဝင်ရန်")}</Link>} />;
}
