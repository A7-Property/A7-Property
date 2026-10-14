"use client";

import { Heart, Home, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { A7AssistantPopover } from "@/components/assistant/a7-assistant-popover";
import { A7Brand } from "@/components/brand/a7-brand";
import { useLanguage } from "@/components/i18n/language-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { IntentNavigation, intentLinks } from "@/components/layout/intent-navigation";
import { cn } from "@/lib/utils";

function SearchNavbar({ savedCount = 0 }: { savedCount?: number }) {
  const { isMyanmar, tx } = useLanguage();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeIntent = pathname.startsWith("/search")
    ? searchParams.get("journey") === "sell"
      ? "sell"
      : searchParams.get("purpose") === "sale"
        ? "buy"
        : "rent"
    : null;
  const mobileLinks = [
    { id: "home", label: "Home", labelMy: "ပင်မ", href: "/", icon: Home },
    ...intentLinks,
    { id: "saved", label: "Saved", labelMy: "သိမ်းထား", href: "/saved", icon: Heart },
  ];

  function returnToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <header className="sticky top-0 z-50 h-[72px] border-b border-[#172B3F]/8 bg-white/90 shadow-[0_1px_0_rgba(255,255,255,.7)] backdrop-blur-2xl">
        <div className="mx-auto flex h-full w-full max-w-[1600px] items-center gap-9 px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="A7 Property home"><A7Brand /></Link>
          <IntentNavigation className="hidden md:flex" />
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <A7AssistantPopover labelClassName="hidden min-[400px]:inline" />
            <LanguageSwitcher className="hidden sm:block" />
            <LanguageSwitcher compact className="sm:hidden" />
            <Link href="/saved" className="hidden h-10 items-center gap-2 rounded-xl px-3 text-xs font-medium text-[#526172] hover:bg-[#EEF3F9] hover:text-[#123B73] sm:flex">
              <Heart className="size-[18px]" />
              {tx("Saved", "သိမ်းထားသည်")}
              {savedCount > 0 && <span data-type="number" className="grid h-6 min-w-6 place-items-center rounded-full bg-[#123B73] px-1.5 text-[10px] font-bold text-white shadow-[0_4px_10px_rgba(18,59,115,.28)]">{savedCount}</span>}
            </Link>
            <Link href="/sign-in" className="grid size-10 place-items-center rounded-xl border border-[#DCE4ED] bg-white text-[#29445F] shadow-sm" aria-label={tx("Sign in", "အကောင့်ဝင်ရန်")}><UserRound className="size-5" /></Link>
          </div>
        </div>
      </header>
      <nav className="fixed inset-x-2 bottom-2 z-50 grid h-[66px] grid-cols-5 rounded-[22px] border border-[#172B3F]/10 bg-white/92 p-1.5 shadow-[0_14px_36px_rgba(23,43,63,.18)] backdrop-blur-2xl md:hidden" aria-label={tx("Mobile search navigation", "မိုဘိုင်းရှာဖွေရေး လမ်းညွှန်")}>
        {mobileLinks.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeIntent;
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={returnToTop}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-medium transition-[transform,background-color,color] duration-200 ease-out active:scale-[.94]",
                active ? "bg-[#DCEBFF] text-[#123B73]" : "text-[#667486]",
              )}
            >
              <Icon className="size-[18px]" />
              {isMyanmar ? item.labelMy : item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export { SearchNavbar };
