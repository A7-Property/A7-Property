"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Heart,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { A7Brand } from "@/components/brand/a7-brand";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DashboardRole = "user" | "owner" | "agent" | "admin";

interface DashboardShellProps {
  role: DashboardRole;
  name: string;
  initials: string;
  title: string;
  description?: string;
  primaryAction?: { label: string; onClick: () => void };
  onNotifications?: () => void;
  children: ReactNode;
}

interface DashboardNavItem {
  label: string;
  labelMy: string;
  mobileLabelMy?: string;
  href: string;
  icon: LucideIcon;
}

const userNav: DashboardNavItem[] = [
  { label: "Overview", labelMy: "အနှစ်ချုပ်", href: "/dashboard", icon: LayoutDashboard },
  { label: "Saved homes", labelMy: "သိမ်းထားသောအိမ်များ", href: "/saved", icon: Heart },
  { label: "Messages", labelMy: "စာများ", href: "/dashboard?section=messages", icon: MessageCircle },
  { label: "Viewings", labelMy: "အိမ်ကြည့်ချိန်များ", href: "/dashboard?section=viewings", icon: CalendarDays },
  { label: "Profile", labelMy: "ပရိုဖိုင်", href: "/profile", icon: UserRound },
];

const adminNav: DashboardNavItem[] = [
  { label: "Overview", labelMy: "အနှစ်ချုပ်", href: "/admin", icon: LayoutDashboard },
  { label: "Verification", labelMy: "စိစစ်ရန်", href: "/admin?section=properties", icon: Building2 },
  { label: "Users", labelMy: "သုံးစွဲသူများ", href: "/admin?section=users", icon: UserRound },
  { label: "Audit Logs", labelMy: "မှတ်တမ်းများ", href: "/admin?section=audit", icon: ShieldCheck },
];

const crmNav = (role: "owner" | "agent"): DashboardNavItem[] => [
  { label: "Overview", labelMy: "အနှစ်ချုပ်", href: `/${role}`, icon: LayoutDashboard },
  { label: "Properties", labelMy: "အိမ်ခြံမြေများ", mobileLabelMy: "အိမ်များ", href: `/${role}?section=properties`, icon: Building2 },
  { label: "Messages", labelMy: "စာများ", href: `/${role}?section=messages`, icon: MessageCircle },
  { label: "Analytics", labelMy: "သုံးသပ်ချက်", href: `/${role}?section=analytics`, icon: BarChart3 },
  { label: "Verification", labelMy: "စိစစ်မှု", mobileLabelMy: "စိစစ်", href: `/${role}?section=verification`, icon: ShieldCheck },
  { label: "Settings", labelMy: "ဆက်တင်များ", mobileLabelMy: "ဆက်တင်", href: `/${role}?section=settings`, icon: Settings },
];

function DashboardShell({ role, name, initials, title, description, primaryAction, onNotifications, children }: DashboardShellProps) {
  const { isMyanmar, tx } = useLanguage();
  const { signOut } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("section") ?? "overview";

  const rawNav = role === "admin" ? adminNav : role === "user" ? userNav : crmNav(role);
  const nav = rawNav.map((item) => ({ ...item, displayLabel: tx(item.label, item.labelMy) }));

  const mobileNav = role === "user" || role === "admin"
    ? nav.slice(0, 4)
    : nav.filter((_, index) => [0, 1, 2, 4, 5].includes(index));

  const roleLabel = role === "admin" ? tx("Admin", "အက်ဒမင်") : role === "owner" ? tx("Owner", "အိမ်ရှင်") : role === "agent" ? tx("Agent", "အကျိုးဆောင်") : tx("My A7 Property", "ကျွန်ုပ်၏ A7 Property");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_78%_-10%,rgba(18,59,115,.08),transparent_28rem),#EAF4FF] text-[#101828]">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[260px] flex-col border-r border-white/10 bg-[linear-gradient(180deg,#101828_0%,#101828_100%)] text-white shadow-[12px_0_36px_rgba(23,43,63,.08)] lg:flex">
        <Link href="/" className="flex h-[76px] items-center gap-2.5 border-b border-white/10 px-6">
          <A7Brand inverted compact={role !== "user"} />
          {role !== "user" && <span className="text-[18px] font-semibold tracking-[-0.04em]">A7</span>}
          {role !== "user" && <span className="ml-auto rounded-full bg-[#F8FBFF]/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-wider">{roleLabel}</span>}
        </Link>
        <nav className="flex flex-1 flex-col gap-1 p-4" aria-label={tx("Dashboard navigation", "ဒက်ရှ်ဘုတ် လမ်းညွှန်")}>
          {nav.map((item) => {
            const section = new URL(item.href, "https://a7.local").searchParams.get("section") ?? "overview";
            const active = item.href.split("?")[0] === pathname && section === activeSection;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("flex h-11 items-center gap-3 rounded-xl px-3 text-sm text-white/68 transition-all hover:bg-[#F8FBFF]/8 hover:text-white", active && "bg-[#F8FBFF]/12 text-white shadow-[inset_0_0_0_1px_rgba(248,251,255,.08)]")}>
                <Icon className="size-[18px]" />{item.displayLabel}
              </Link>
            );
          })}
          <Link href="/search?purpose=rent&browse=all" className="mt-auto flex h-11 items-center gap-3 rounded-xl px-3 text-sm text-white/68 hover:bg-[#F8FBFF]/8 hover:text-white"><Search className="size-[18px]" />{tx("Browse marketplace", "ဈေးကွက်ရှာဖွေရန်")}</Link>
          <button type="button" onClick={() => signOut()} className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-white/68 transition-all hover:bg-[#F8FBFF]/8 hover:text-white"><LogOut className="size-[18px]" />{tx("Log out", "ထွက်ရန်")}</button>
        </nav>
        <Link href="/profile" className="m-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#F8FBFF]/6 p-3 transition-colors hover:bg-[#F8FBFF]/10">
          <span className="grid size-10 place-items-center rounded-full bg-[#DCEBFF] text-sm font-semibold text-[#101828]">{initials}</span>
          <span className="min-w-0"><strong className="block truncate text-xs">{name}</strong><small className="mt-1 block text-[9px] text-white/55">{tx("View account", "အကောင့်ကြည့်ရန်")}</small></span>
        </Link>
      </aside>

      <div className="min-w-0 lg:pl-[260px]">
        <header className="a7-header-surface sticky top-0 z-40 flex h-[72px] items-center justify-between px-4 sm:px-7 lg:px-9">
          <Link href="/" className="inline-flex min-h-11 min-w-11 shrink-0 items-center lg:hidden" aria-label={tx("A7 Property home", "A7 Property ပင်မစာမျက်နှာ")}>
            <A7Brand compact className="min-[520px]:hidden" />
            <A7Brand className="hidden min-[520px]:inline-flex" />
          </Link>
          <div className="hidden lg:block"><span className="text-xs font-medium text-[#667085]">{role === "user" ? roleLabel : tx(`${roleLabel} workspace`, `${roleLabel} လုပ်ငန်းခွင်`)}</span></div>
          <div className="flex items-center gap-2">
            {primaryAction && <div className="hidden sm:block"><Button className="h-10 rounded-xl text-xs" onClick={primaryAction.onClick}><Plus className="size-4" />{primaryAction.label}</Button></div>}
            <LanguageSwitcher className="hidden sm:block" />
            <LanguageSwitcher compact className="sm:hidden" />
            <Button size="icon" variant="ghost" className="relative rounded-xl" aria-label={tx("Notifications", "အသိပေးချက်များ")} onClick={onNotifications}><Bell className="size-5" /><span className="absolute right-2.5 top-2.5 size-2 rounded-full border-2 border-white bg-[#123B73]" /></Button>
            <span className="grid size-9 place-items-center rounded-full bg-[#DCEBFF] text-xs font-semibold text-[#123B73]">{initials}</span>
          </div>
        </header>

        <main className="mx-auto w-full min-w-0 max-w-[1460px] px-4 pb-28 pt-6 sm:px-7 lg:px-9 lg:pb-12 lg:pt-9">
          <div className="mb-6 flex items-end justify-between gap-5 sm:mb-8">
            <div><p className="eyebrow mb-2">{role === "user" ? roleLabel : tx(`${roleLabel} workspace`, `${roleLabel} လုပ်ငန်းခွင်`)}</p><h1 className="text-[28px] font-semibold tracking-[-0.045em] sm:text-[34px]">{title}</h1>{description && <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#667085] sm:text-sm">{description}</p>}</div>
            {primaryAction && <div className="sm:hidden"><Button size="icon" onClick={primaryAction.onClick} aria-label={primaryAction.label}><Plus className="size-5" /></Button></div>}
          </div>
          {children}
        </main>
      </div>

      <nav className={cn("a7-mobile-nav-shell fixed inset-x-2.5 z-50 mx-auto grid max-w-[520px] p-2 lg:hidden", (role === "user" || role === "admin") ? "grid-cols-4" : "grid-cols-5")} aria-label={tx("Mobile dashboard navigation", "မိုဘိုင်းဒက်ရှ်ဘုတ် လမ်းညွှန်")}>
        {mobileNav.map((item) => {
          const Icon = item.icon;
          const section = new URL(item.href, "https://a7.local").searchParams.get("section") ?? "overview";
          const active = section === activeSection;
          const mobileLabel = isMyanmar ? item.mobileLabelMy ?? item.displayLabel : item.displayLabel;
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("a7-mobile-nav-item flex min-w-0 flex-col items-center justify-center gap-1 px-0.5 font-medium transition-colors", isMyanmar ? "text-[11px]" : "text-[10px]", active ? "a7-mobile-nav-item-active" : "hover:bg-white/45 hover:text-[#123B73]")}><Icon className={cn("shrink-0", active ? "size-[22px]" : "size-5")} /><span className="max-w-full truncate leading-none">{mobileLabel}</span></Link>;
        })}
      </nav>
    </div>
  );
}

export { DashboardShell };
export type { DashboardRole };
