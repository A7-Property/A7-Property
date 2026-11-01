"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Home, LineChart, CreditCard, MessageCircle, Trophy, User, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type BottomNavItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
};

const navItems: readonly BottomNavItem[] = [
  { label: "Home", icon: Home },
  { label: "Portfolio", icon: LineChart },
  { label: "Transactions", icon: CreditCard },
  { label: "Messages", icon: MessageCircle },
  { label: "Rewards", icon: Trophy },
  { label: "Profile", icon: User },
];

const MOBILE_LABEL_WIDTH = 72;
const MotionLink = motion.create(Link);
const spring = { type: "spring", stiffness: 350, damping: 32 } as const;

export type BottomNavBarProps = {
  className?: string;
  defaultIndex?: number;
  stickyBottom?: boolean;
  items?: readonly BottomNavItem[];
  /** Pass the route's index for navigation; omit for a standalone demo. */
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  ariaLabel?: string;
};

export function BottomNavBar({
  className,
  defaultIndex = 0,
  stickyBottom = false,
  items = navItems,
  activeIndex,
  onActiveIndexChange,
  ariaLabel = "Bottom Navigation",
}: BottomNavBarProps) {
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex);
  const reduceMotion = useReducedMotion();
  const currentIndex = activeIndex ?? selectedIndex;

  function select(index: number) {
    if (activeIndex === undefined) setSelectedIndex(index);
    onActiveIndexChange?.(index);
  }

  return (
    <motion.nav
      initial={false}
      aria-label={ariaLabel}
      className={cn(
        "flex min-h-[60px] w-[420px] max-w-[calc(100vw-20px)] items-center gap-0.5 rounded-full border border-border bg-card p-1.5 shadow-xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300",
        stickyBottom && "fixed inset-x-2.5 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[80] mx-auto",
        className,
      )}
    >
      {items.map((item, idx) => {
        const Icon = item.icon;
        const isActive = currentIndex === idx;
        const controlProps = {
          initial: false as const,
          animate: { flexGrow: isActive ? 2.4 : 1 },
          transition: reduceMotion ? { duration: 0 } : spring,
          whileTap: reduceMotion ? undefined : { scale: 0.97 },
          className: cn(
            "relative flex h-11 min-h-11 min-w-11 basis-0 items-center justify-center rounded-full px-2 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            isActive
              ? "bg-[var(--mobile-nav-active-background)] text-primary"
              : "bg-transparent text-muted-foreground hover:bg-muted",
          ),
          "aria-label": item.label,
          title: item.label,
        };
        const content = (
          <>
            <Icon size={22} strokeWidth={2} aria-hidden="true" className="shrink-0" />
            <motion.span
              initial={false}
              animate={{
                width: isActive ? MOBILE_LABEL_WIDTH : 0,
                opacity: isActive ? 1 : 0,
                marginLeft: isActive ? 8 : 0,
              }}
              transition={reduceMotion ? { duration: 0 } : {
                width: spring,
                opacity: { duration: 0.19 },
                marginLeft: { duration: 0.19 },
              }}
              aria-hidden="true"
              className="flex min-w-0 max-w-[72px] items-center overflow-hidden"
            >
              <span className="select-none truncate text-xs font-medium leading-[1.9]">{item.label}</span>
            </motion.span>
          </>
        );

        return item.href ? (
          <MotionLink key={item.href} {...controlProps} href={item.href} aria-current={isActive ? "page" : undefined} onNavigate={() => select(idx)}>
            {content}
          </MotionLink>
        ) : (
          <motion.button key={item.label} {...controlProps} type="button" aria-pressed={isActive} onClick={() => select(idx)}>
            {content}
          </motion.button>
        );
      })}
    </motion.nav>
  );
}

export default BottomNavBar;
