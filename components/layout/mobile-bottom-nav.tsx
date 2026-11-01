"use client";

import { Heart, Home, MessageCircle, Search, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";

import { useLanguage } from "@/components/i18n/language-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { BottomNavBar } from "@/components/ui/bottom-nav-bar";

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
  const { user } = useAuth();
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

  const visibleItems = user?.accountType === "lister" ? items.filter((item) => item.id !== "saved") : items;

  return (
    <BottomNavBar
      stickyBottom
      className="a7-mobile-nav-shell !h-auto !rounded-full lg:hidden"
      ariaLabel={tx("Primary mobile navigation", "မိုဘိုင်းအဓိက လမ်းညွှန်")}
      activeIndex={visibleItems.findIndex((item) => item.id === activeId)}
      items={visibleItems.map((item) => ({
        href: item.href,
        icon: item.icon,
        label: isMyanmar ? item.labelMy : pathname === "/" && item.id === "search" ? "Search" : pathname === "/" && item.id === "messages" ? "Inbox" : item.label,
      }))}
    />
  );
}

export { MobileBottomNav };
