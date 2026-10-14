"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { HousePlus } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { A7Brand } from "@/components/brand/a7-brand";
import { useLanguage } from "@/components/i18n/language-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { Button } from "@/components/ui/button";

export function ListerAccessNotice() {
  const { tx } = useLanguage();
  const { signOut } = useAuth();
  const router = useRouter();

  function useListerAccount() {
    window.sessionStorage.setItem("a7-auth-return-to", "/owner?create=1");
    signOut();
    router.replace("/sign-in?role=lister");
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#101828]">
      <header className="a7-header-surface border-b border-[#DCE4ED]">
        <div className="mx-auto flex min-h-20 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="inline-flex min-h-11 min-w-11 items-center" aria-label={tx("A7 Property home", "A7 Property ပင်မစာမျက်နှာ")}><A7Brand /></Link>
          <LanguageSwitcher compact />
        </div>
      </header>
      <main className="mx-auto max-w-xl px-5 py-12 sm:py-20" aria-labelledby="lister-access-title">
        <div className="mb-6 grid size-14 place-items-center rounded-2xl bg-[#DCEBFF] text-[#0057D9]"><HousePlus className="size-7" aria-hidden="true" /></div>
        <h1 id="lister-access-title" className="text-2xl font-semibold leading-relaxed">{tx("A lister account is required", "အိမ်စာရင်းတင်သူ အကောင့် လိုအပ်ပါသည်")}</h1>
        <p className="mt-4 text-base leading-8 text-[#526172]">{tx("Only listers can create and publish property listings. Your current account does not have listing access.", "အိမ်စာရင်းတင်သူ (lister) များသာ အိမ်စာရင်းဖန်တီးပြီး ကြော်ငြာထုတ်နိုင်ပါသည်။ သင့်လက်ရှိအကောင့်တွင် အိမ်စာရင်းတင်ခွင့် မရှိပါ။")}</p>
        <p className="mt-3 text-sm leading-7 text-[#526172]">{tx("Sign out and use a registered lister account, or create a new lister account. Choosing lister at sign-in does not change an existing account's role.", "လက်ရှိအကောင့်မှ ထွက်ပြီး lister အကောင့်ဖြင့် ဝင်ပါ၊ သို့မဟုတ် lister အကောင့်သစ် ဖွင့်ပါ။ အကောင့်ဝင်ချိန်တွင် lister ရွေးရုံဖြင့် ရှိပြီးသားအကောင့်၏ အမျိုးအစား မပြောင်းပါ။")}</p>
        <div className="mt-7 flex flex-col items-start gap-3">
          <Button className="h-auto max-w-full whitespace-normal py-3 text-center" onClick={useListerAccount}>{tx("Sign out and use a lister account", "အကောင့်ထွက်ပြီး lister ဖြင့် ဝင်ရန်")}</Button>
          <Link href="/profile" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#0057D9] hover:underline">{tx("Keep my account and open profile", "လက်ရှိအကောင့်ဖြင့် ပရိုဖိုင်ကြည့်ရန်")}</Link>
        </div>
      </main>
    </div>
  );
}
