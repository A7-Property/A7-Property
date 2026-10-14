"use client";

import { Bell, LogIn } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

import { useLanguage } from "@/components/i18n/language-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useAuth } from "@/components/auth/auth-provider";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MobileAppHeaderProps {
  avatarAlt?: string;
  className?: string;
  languageLabelClassName?: string;
  notificationHref?: string;
  onAvatarClick?: () => void;
  onNotificationClick?: () => void;
  theme?: "light" | "dark";
}

/** Shared primary header for the mobile A7 Property journeys. */
function MobileAppHeader({
  avatarAlt,
  className,
  languageLabelClassName,
  notificationHref = "/messages",
  onAvatarClick,
  onNotificationClick,
  theme = "light",
}: MobileAppHeaderProps) {
  const { tx } = useLanguage();
  const { user, status } = useAuth();
  const reduceMotion = useReducedMotion();
  const isDark = theme === "dark";
  const iconColor = isDark ? "text-[#E7E9EE] hover:bg-white/10" : "text-[#424655] hover:bg-[#EFEDF1]";
  const languageButton = isDark
    ? "h-11 gap-1.5 rounded-full bg-white/10 px-2.5 text-[#E7E9EE] hover:bg-white/15 hover:text-white sm:gap-2 sm:px-4"
    : "h-11 gap-1.5 rounded-full bg-[#EFEDF1] px-2.5 text-[#424655] hover:bg-[#E3E2E6] hover:text-[#424655] sm:gap-2 sm:px-4";

  const initials = user?.fullName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "A7";
  const avatar = user ? <Avatar src={user.avatarUrl} alt={avatarAlt ?? user.fullName} initials={initials} className="size-9 border border-[#D9DDE8] bg-[#DCEBFF] text-[#123B73] shadow-[0_2px_8px_rgba(16,24,40,.10)] sm:size-11" /> : <span className="grid size-9 place-items-center rounded-full border border-[#D9DDE8] bg-white text-[#123B73] sm:size-11"><LogIn className="size-4" /></span>;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }}
      className={cn("mx-auto flex h-16 w-full max-w-[920px] items-center justify-between gap-2 px-3 sm:px-6", className)}
    >
      <Link href="/" className="flex min-h-11 min-w-0 shrink items-center gap-2 sm:gap-3" aria-label={tx("A7 Property home", "A7 Property ပင်မစာမျက်နှာ")}>
        <span className="relative size-9 shrink-0 overflow-hidden rounded-full bg-white shadow-[0_2px_8px_rgba(16,24,40,.12)] sm:size-11">
          <Image src="/images/brand/a7-property-logo.jpg" alt="" fill loading="eager" sizes="44px" className="scale-[2.55] object-contain" />
        </span>
        <span className="hidden truncate text-[19px] font-semibold tracking-[-.045em] text-[#0053D2] min-[360px]:inline sm:text-[26px]">A7 Property</span>
      </Link>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <LanguageSwitcher className="shrink-0" buttonClassName={languageButton} labelClassName={languageLabelClassName} />
        {onNotificationClick ? (
          <button type="button" onClick={onNotificationClick} className={cn("relative grid size-11 place-items-center rounded-full transition-colors", iconColor)} aria-label={tx("Notifications", "အသိပေးချက်များ")}>
            <Bell className="size-5 sm:size-6" strokeWidth={1.9} />
            <span className={cn("absolute right-1 top-1 size-1.5 rounded-full bg-[#007AFF] ring-2 sm:right-1.5 sm:top-1.5 sm:size-2", isDark ? "ring-[#202124]" : "ring-white")} />
          </button>
        ) : (
          <Link href={notificationHref} className={cn("relative grid size-11 place-items-center rounded-full transition-colors", iconColor)} aria-label={tx("Messages and alerts", "မက်ဆေ့ချ်နှင့် အသိပေးချက်များ")}>
            <Bell className="size-5 sm:size-6" strokeWidth={1.9} />
            <span className={cn("absolute right-1 top-1 size-1.5 rounded-full bg-[#007AFF] ring-2 sm:right-1.5 sm:top-1.5 sm:size-2", isDark ? "ring-[#202124]" : "ring-white")} />
          </Link>
        )}
        {user ? (
          onAvatarClick ? (
            <button type="button" onClick={onAvatarClick} aria-label={tx("Edit profile", "ပရိုဖိုင်ပြင်ရန်")} className="grid size-11 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0053D2]/25">
              {avatar}
            </button>
          ) : (
            <Link href="/profile" className="grid size-11 place-items-center rounded-full" aria-label={tx("Open profile", "ပရိုဖိုင်ဖွင့်ရန်")}>
              {avatar}
            </Link>
          )
        ) : (
          <div className="flex items-center gap-2" aria-busy={status === "loading"}>
            <Link href="/sign-in" className={cn("inline-flex h-9 items-center justify-center rounded-full border px-3.5 text-[13px] font-semibold transition-colors", isDark ? "border-white/20 bg-white/10 text-white hover:bg-white/15" : "border-[#DCE2EA] bg-white text-[#191B24] hover:bg-[#F4F5F8]")}>
              {tx("Sign in", "အကောင့်ဝင်ရန်")}
            </Link>
            <Link href="/sign-in?mode=create" className="inline-flex h-9 items-center justify-center rounded-full bg-[#123B73] px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#0E2C57]">
              {tx("Sign up", "အကောင့်သစ်ဖွင့်ရန်")}
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export { MobileAppHeader };
