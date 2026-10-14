"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";

import { AuthTokenShell, type AuthFlowState } from "@/components/auth/auth-token-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import * as authApi from "@/lib/api/auth";

/** Matches the backend rule: 12+ characters containing letters and numbers. */
const minPasswordLength = 12;
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).+$/;

/**
 * Lands the `?token=` link from the password reset email. The token is single-use
 * and expires in 30 minutes; a successful reset also signs out every session.
 */
function ResetPasswordView() {
  const { tx } = useLanguage();
  const { mode } = useAuth();
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<AuthFlowState>("idle");
  const [message, setMessage] = useState("");

  const unavailable = mode !== "server"
    ? tx("This build has no API configured, so passwords cannot be reset here.", "ဤ build တွင် API မသတ်မှတ်ထားသဖြင့် စကားဝှက်ပြန်သတ်မှတ်မှုကို ဤနေရာတွင် မလုပ်ဆောင်နိုင်ပါ။")
    : !token
      ? tx("This link is missing its reset token. Request a new one from the sign-in screen.", "ဤလင့်ခ်တွင် ပြန်သတ်မှတ်ကုဒ် ပါဝင်မနေပါ။ အကောင့်ဝင်သည့်စာမျက်နှာမှ အသစ်တောင်းဆိုပါ။")
      : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (unavailable || !token) return;

    if (password.length < minPasswordLength || !passwordPattern.test(password)) {
      setState("error");
      setMessage(tx(
        `Use at least ${minPasswordLength} characters with both letters and numbers.`,
        `အနည်းဆုံး ${minPasswordLength} လုံးရှိပြီး အက္ခရာနှင့် နံပါတ် နှစ်မျိုးပါဝင်ရပါမည်။`,
      ));
      return;
    }
    if (password !== confirmPassword) {
      setState("error");
      setMessage(tx("Passwords do not match.", "စကားဝှက်များ မတူညီပါ။"));
      return;
    }

    setState("working");
    setMessage(tx("Saving your new password…", "စကားဝှက်အသစ်ကို သိမ်းဆည်းနေပါသည်…"));
    try {
      await authApi.resetPassword(token, password);
      setState("done");
      setMessage(tx(
        "Your password is updated and every other device has been signed out. Redirecting you to sign in…",
        "စကားဝှက်ကို အသစ်ပြောင်းပြီးပါပြီ၊ အခြားစက်အားလုံးမှ အကောင့်ထွက်လိုက်ပါပြီ။ အကောင့်ဝင်သည့်စာမျက်နှာသို့ ပြောင်းနေပါသည်…",
      ));
      window.setTimeout(() => router.replace("/sign-in"), 2200);
    } catch (error) {
      setState("error");
      setMessage(error instanceof ApiError && error.status === 400
        ? tx("This reset link has already been used or has expired. Request a new one.", "ဤပြန်သတ်မှတ်လင့်ခ်ကို အသုံးပြုပြီးသား သို့မဟုတ် သက်တမ်းကုန်သွားပါပြီ။ အသစ်တောင်းဆိုပါ။")
        : tx("Your password could not be reset. Please try again.", "စကားဝှက်ကို ပြန်သတ်မှတ်နိုင်ခြင်း မရှိပါ။ ထပ်မံကြိုးစားပါ။"));
    }
  }

  const inputClass = "h-11 w-full rounded-[var(--radius-control)] border border-[#DCE2EA] bg-white px-3.5 pr-12 text-[15px] text-[#101828] outline-none focus-visible:ring-4 focus-visible:ring-[#123B73]/20";

  return (
    <AuthTokenShell
      title={tx("Set a new password", "စကားဝှက်အသစ် သတ်မှတ်ခြင်း")}
      description={tx("Choose a password you have not used here before. Saving it signs out every device.", "ယခင်မသုံးဘူးသော စကားဝှက်ကို ရွေးပါ။ သိမ်းဆည်းပါက စက်အားလုံးမှ အကောင့်ထွက်သွားပါမည်။")}
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
            <label htmlFor="reset-password" className="block text-[13px] font-semibold text-[#344054]">
              {tx("New password", "စကားဝှက်အသစ်")}
            </label>
            <div className="relative mt-1.5">
              <input
                id="reset-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClass}
                aria-describedby="reset-password-hint"
              />
              <button
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? tx("Hide password", "စကားဝှက် ဖျောက်မည်") : tx("Show password", "စကားဝှက် ပြမည်")}
                className="absolute right-1 top-0 grid size-11 place-items-center rounded-[var(--radius-control)] text-[#687385] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#123B73]/20"
              >
                {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
              </button>
            </div>
            <p id="reset-password-hint" className="mt-1.5 text-[12px] text-[#687385]">
              {tx(`At least ${minPasswordLength} characters, with letters and numbers.`, `အနည်းဆုံး ${minPasswordLength} လုံး၊ အက္ခရာနှင့် နံပါတ် ပါဝင်ရမည်။`)}
            </p>
          </div>

          <div>
            <label htmlFor="reset-password-confirm" className="block text-[13px] font-semibold text-[#344054]">
              {tx("Confirm new password", "စကားဝှက်အသစ် အတည်ပြုပါ")}
            </label>
            <input
              id="reset-password-confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={`${inputClass} mt-1.5`}
            />
          </div>

          <Button type="submit" className="w-full" disabled={state === "working"}>
            {tx("Save new password", "စကားဝှက်အသစ် သိမ်းမည်")}
          </Button>
        </form>
      )}
    </AuthTokenShell>
  );
}

export { ResetPasswordView };
