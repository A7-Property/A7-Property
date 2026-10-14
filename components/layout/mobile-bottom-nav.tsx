"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Heart, Home, MessageCircle, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLanguage } from "@/components/i18n/language-provider";
import { a7Motion } from "@/lib/motion";
import { cn } from "@/lib/utils";

const items = [
  { id: "home", href: "/", label: "Home", labelMy: "ပင်မ", icon: Home },
  { id: "search", href: "/search?purpose=rent", label: "Explore", labelMy: "လေ့လာ", icon: Search },
  { id: "saved", href: "/saved", label: "Saved", labelMy: "သိမ်းထား", icon: Heart },
  { id: "messages", href: "/messages", label: "Messages", labelMy: "စာများ", icon: MessageCircle },
  { id: "profile", href: "/profile", label: "Profile", labelMy: "ပရိုဖိုင်", icon: UserRound },
] as const;

function MobileBottomNav() {
  const pathname = usePathname();
  const { isMyanmar, tx } = useLanguage();
  const reduceMotion = useReducedMotion();
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/owner") || pathname.startsWith("/agent") || pathname.startsWith("/properties") || pathname.startsWith("/dashboard")) return null;
  const activeId = pathname === "/"
    ? "home"
    : pathname.startsWith("/search") || pathname.startsWith("/properties") || pathname.startsWith("/assistant")
      ? "search"
      : pathname.startsWith("/saved") || pathname.startsWith("/dashboard") || pathname.startsWith("/compare")
        ? "saved"
        : pathname.startsWith("/messages")
          ? "messages"
          : pathname.startsWith("/profile")
            ? "profile"
            : "home";

  return (
    <nav
      className="a7-mobile-nav-shell fixed inset-x-2.5 z-[80] mx-auto grid max-w-[520px] grid-cols-5 px-2.5 py-2 lg:hidden"
      aria-label={tx("Primary mobile navigation", "မိုဘိုင်းအဓိက လမ်းညွှန်")}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.id === activeId;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "a7-mobile-nav-item group relative flex min-w-0 flex-col items-center justify-center gap-1 overflow-hidden px-0.5 font-medium transition-[color,transform] duration-200 active:scale-[.96]",
              isMyanmar ? "text-[11px]" : "text-[10px]",
              active ? "text-[#123B73]" : "hover:text-[#123B73]",
            )}
          >
            {active && <motion.span layoutId="a7-mobile-nav-active" className="a7-mobile-nav-active-pill absolute inset-0" transition={reduceMotion ? { duration: 0 } : a7Motion.spring} aria-hidden="true" />}
            <motion.span animate={reduceMotion ? undefined : { scale: active ? 1.04 : 1 }} transition={reduceMotion ? { duration: 0 } : a7Motion.base} className="relative z-10 flex h-9 w-11 items-center justify-center rounded-[18px] transition-colors duration-200 group-hover:bg-white/28">
              <Icon className={cn("relative z-10 transition-[color,fill,width,height] duration-200", active ? "size-[22px] text-[#123B73]" : "size-5 text-[#667085]", active && item.id === "saved" && "fill-current")} strokeWidth={active ? 2.3 : 1.9} />
            </motion.span>
            <span className={cn("relative top-px z-10 inline-flex h-4 max-w-full items-center justify-center truncate px-0.5 leading-none", active ? "font-semibold text-[#0053D2]" : "text-[#667085]")}>{isMyanmar ? item.labelMy : pathname === "/" && item.id === "search" ? "Search" : pathname === "/" && item.id === "messages" ? "Inbox" : item.label}</span>
            {item.id === "messages" && <span className="absolute right-[26%] top-2 z-20 size-[7px] rounded-full bg-[#4DA3FF] shadow-[0_0_0_2px_rgba(248,251,255,.8)]" aria-hidden="true" />}
          </Link>
        );
      })}
    </nav>
  );
}

export { MobileBottomNav };
