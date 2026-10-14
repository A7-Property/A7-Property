"use client";

import Link from "next/link";
import { Heart, LogOut, Menu, Sparkles, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";

import { A7AssistantPopover } from "@/components/assistant/a7-assistant-popover";
import { useAuth } from "@/components/auth/auth-provider";
import { A7Brand } from "@/components/brand/a7-brand";
import { useLanguage } from "@/components/i18n/language-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { IntentNavigation, intentLinks } from "@/components/layout/intent-navigation";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";

interface AppHeaderProps {
  compact?: boolean;
}

function AppHeader({ compact = false }: AppHeaderProps) {
  const { isMyanmar, tx } = useLanguage();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const intentDescriptions = {
    rent: tx("Browse verified rentals", "စိစစ်ထားသော ငှားရန်အိမ်များကို ကြည့်ပါ"),
    buy: tx("Explore homes for sale", "ရောင်းရန်အိမ်များကို ရှာဖွေပါ"),
    sell: tx("List and manage a property", "အိမ်ကို စာရင်းတင်ပြီး စီမံပါ"),
  };

  function handleSignOut() {
    signOut();
    router.push("/");
  }

  return (
    <header className={`a7-header-surface sticky top-0 z-50 ${compact ? "h-[68px]" : "h-[76px]"}`}>
      <div className="mx-auto flex h-full w-full min-w-0 max-w-[1480px] items-center justify-between gap-2 px-3 min-[360px]:px-4 sm:gap-5 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex min-h-11 min-w-11 shrink-0 items-center" aria-label="A7 Property home">
          <A7Brand compact className="min-[520px]:hidden" />
          <A7Brand className="hidden min-[520px]:inline-flex" />
        </Link>

        <Suspense fallback={<div className="hidden h-11 w-[252px] rounded-full bg-[#F2F6FA] md:block" aria-hidden="true" />}>
          <IntentNavigation className="hidden md:flex" />
        </Suspense>

        <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
          <span className="hidden min-[520px]:inline-flex">
            <A7AssistantPopover labelClassName="hidden lg:inline" />
          </span>
          <LanguageSwitcher className="hidden sm:block" />
          <LanguageSwitcher compact className="sm:hidden" />
          <Link href="/saved" className="hidden size-11 place-items-center rounded-xl text-[#526172] transition-colors hover:bg-[#EEF3F9] hover:text-[#0057D9] sm:grid" aria-label={tx("Saved homes", "သိမ်းထားသောအိမ်များ")}>
            <Heart className="size-4" />
          </Link>
          {user ? (
            <div className="flex items-center gap-2">
              <Link href="/profile" className="hidden max-w-[140px] truncate rounded-xl bg-[#EDF4FF] px-3 py-2 text-xs font-semibold text-a7-blue sm:block">{user.fullName}</Link>
              <button type="button" onClick={handleSignOut} className="grid size-11 place-items-center rounded-xl border border-[#DCE4ED] bg-white text-[#29445F] shadow-sm transition-colors hover:border-[#FF6B6B] hover:text-[#D92D20]" aria-label={tx("Sign out", "အကောင့်ထွက်ရန်")}>
                <LogOut className="size-4" />
              </button>
            </div>
          ) : (
            <Link href="/sign-in" className="grid size-11 place-items-center rounded-xl border border-[#DCE4ED] bg-white text-[#29445F] shadow-sm transition-colors hover:border-[#9FC4FF] hover:text-[#0057D9]" aria-label={tx("Sign in", "အကောင့်ဝင်ရန်")}>
              <UserCircle className="size-5" />
            </Link>
          )}
          <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setMenuOpen(true)} aria-label={tx("Open navigation", "လမ်းညွှန်မီနူး ဖွင့်ရန်")}>
            <Menu className="size-5" />
          </Button>
        </div>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen} title={tx("Explore A7 Property", "A7 Property ကို လေ့လာပါ")} side="right">
        <nav className="flex flex-col p-5 text-sm font-medium">
          <div className="grid gap-2">
            {intentLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.id} className="flex items-center gap-3 rounded-[var(--radius-control)] border border-a7-line bg-white p-3.5 shadow-[var(--shadow-hairline)] transition-colors hover:border-[#9FC4FF] hover:bg-[#F7FAFF]" href={item.href} onClick={() => setMenuOpen(false)}>
                  <Icon className="size-5" strokeWidth={2.1} />
                  <span><strong className="block text-sm">{isMyanmar ? item.labelMy : item.label}</strong><small className="mt-1 block text-[10px] font-normal text-[#667486]">{intentDescriptions[item.id]}</small></span>
                </Link>
              );
            })}
          </div>
          <Link className="mt-5 flex items-center gap-3 border-b border-[#D1D1D5] py-4" href="/assistant" onClick={() => setMenuOpen(false)}>
            <Sparkles className="size-4" />{tx("AI home assistant", "AI အိမ်ရှာဖွေရေးအကူ")}
          </Link>
          <Link className="flex items-center gap-3 border-b border-[#D1D1D5] py-4" href="/saved" onClick={() => setMenuOpen(false)}>
            <Heart className="size-4" />{tx("Saved homes", "သိမ်းထားသောအိမ်များ")}
          </Link>
          {user && <button type="button" onClick={() => { handleSignOut(); setMenuOpen(false); }} className="flex items-center gap-3 border-b border-[#D1D1D5] py-4 text-[#D92D20]">
            <LogOut className="size-4" />{tx("Sign out", "အကောင့်ထွက်ရန်")}
          </button>}
        </nav>
      </Sheet>
    </header>
  );
}

export { AppHeader };
