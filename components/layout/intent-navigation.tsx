"use client";

import { Building2, HousePlus, KeyRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { useLanguage } from "@/components/i18n/language-provider";
import { cn } from "@/lib/utils";

const intentLinks = [
  {
    id: "rent",
    label: "Rent",
    labelMy: "ငှားရန်",
    href: "/search?purpose=rent",
    icon: KeyRound,
  },
  {
    id: "buy",
    label: "Buy",
    labelMy: "ဝယ်ရန်",
    href: "/search?purpose=sale",
    icon: Building2,
  },
  {
    id: "sell",
    label: "Sell",
    labelMy: "ရောင်းရန်",
    href: "/owner?create=1&purpose=sale",
    icon: HousePlus,
  },
] as const;

function IntentNavigation({ className }: { className?: string }) {
  const { isMyanmar, tx } = useLanguage();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeIntent = pathname === "/owner" || pathname === "/agent"
    ? "sell"
    : pathname.startsWith("/search")
      ? searchParams.get("purpose") === "sale"
        ? "buy"
        : "rent"
      : null;

  function returnToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <nav
      className={cn(
        "items-center rounded-full border border-[#172B3F]/7 bg-[#F2F6FA] p-1 text-[13px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,.8)]",
        className,
      )}
      aria-label={tx("Property journeys", "အိမ်ရှာဖွေရေး လမ်းကြောင်းများ")}
    >
      {intentLinks.map((item) => {
        const Icon = item.icon;
        const active = activeIntent === item.id;

        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={returnToTop}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full px-4 transition-[transform,background-color,color,box-shadow] duration-200 ease-out hover:bg-white hover:text-[#0057D9] active:scale-[.96]",
              active
                ? "bg-white font-semibold text-[#0057D9] shadow-[0_2px_9px_rgba(23,43,63,.09)]"
                : "text-[#526172]",
            )}
          >
            <Icon className="size-3.5" strokeWidth={2.1} />
            {isMyanmar ? item.labelMy : item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export { IntentNavigation, intentLinks };
