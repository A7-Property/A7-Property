"use client";

import { Icon } from "@iconify/react";
import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";

type IconSize = "xs" | "sm" | "md" | "lg" | "xl";
type IconVariant = "default" | "gradient" | "solid" | "ghost" | "glow" | "depth";
type IconEntrance = "none" | "pop";

const sizeMap: Record<IconSize, { icon: string; box: string }> = {
  xs: { icon: "size-3.5", box: "size-7" },
  sm: { icon: "size-4", box: "size-8" },
  md: { icon: "size-5", box: "size-10" },
  lg: { icon: "size-6", box: "size-12" },
  xl: { icon: "size-7", box: "size-14" },
};

const variantStyles: Record<IconVariant, { wrapper: string; icon: string }> = {
  default: { wrapper: "", icon: "" },
  gradient: { wrapper: "bg-gradient-to-br from-[#0057D9] to-[#003F91] text-white shadow-[0_4px_14px_rgba(0, 87, 217,.25)]", icon: "" },
  solid: { wrapper: "bg-[#EEF5FC] text-[#0057D9]", icon: "" },
  ghost: { wrapper: "bg-white/10 text-white backdrop-blur", icon: "" },
  glow: { wrapper: "bg-[#0057D9]/10 text-[#0057D9] shadow-[0_0_20px_rgba(0, 87, 217,.15)]", icon: "" },
  depth: {
    wrapper: "relative isolate overflow-hidden border border-white/90 bg-[linear-gradient(145deg,#FFFFFF_0%,#E9F2FF_45%,#B8D3F7_100%)] text-[#123B73] shadow-[0_9px_18px_rgba(18,59,115,.2),inset_0_1px_0_rgba(255,255,255,.95),inset_0_-3px_5px_rgba(18,59,115,.12)]",
    icon: "relative z-10 drop-shadow-[0_2px_2px_rgba(18,59,115,.24)]",
  },
};

interface AnimatedIconProps {
  icon: string;
  size?: IconSize;
  variant?: IconVariant;
  className?: string;
  iconClassName?: string;
  hover?: "none" | "scale" | "rotate" | "bounce" | "wiggle" | "pulse" | "tilt";
  entrance?: IconEntrance;
  wrapperClassName?: string;
  style?: CSSProperties;
}

const hoverAnimations = {
  none: {},
  scale: { scale: 1.15 },
  rotate: { rotate: 15, scale: 1.1 },
  bounce: { y: -3 },
  wiggle: { rotate: [0, -8, 8, -4, 0] },
  pulse: { scale: [1, 1.12, 1] },
  tilt: { y: -2, rotateX: 8, rotateY: -8, scale: 1.04 },
};

const entranceAnimations = {
  none: { initial: false, animate: undefined },
  pop: {
    initial: { opacity: 0, y: 4, scale: 0.72, rotate: -10 },
    animate: { opacity: 1, y: 0, scale: 1, rotate: 0 },
  },
};

function AnimatedIcon({
  icon,
  size = "md",
  variant = "default",
  className,
  iconClassName,
  hover = "none",
  entrance = "none",
  wrapperClassName,
  style,
}: AnimatedIconProps) {
  const reduceMotion = useReducedMotion();
  const s = sizeMap[size];
  const v = variantStyles[variant];
  const entranceAnimation = entranceAnimations[entrance];

  if (variant === "default") {
    return (
      <motion.span
        className={`${s.icon} ${iconClassName ?? ""} ${className ?? ""}`}
        initial={reduceMotion ? false : entranceAnimation.initial}
        animate={reduceMotion ? undefined : entranceAnimation.animate}
        whileHover={reduceMotion ? undefined : hoverAnimations[hover]}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        style={style}
      >
        <Icon icon={icon} className="size-full" />
      </motion.span>
    );
  }

  return (
    <motion.span
      className={`grid ${s.box} place-items-center rounded-xl ${v.wrapper} ${wrapperClassName ?? ""} ${className ?? ""}`}
      initial={reduceMotion ? false : entranceAnimation.initial}
      animate={reduceMotion ? undefined : entranceAnimation.animate}
      whileHover={reduceMotion ? undefined : hoverAnimations[hover]}
      whileTap={reduceMotion || hover !== "tilt" ? undefined : { y: 1, rotateX: 0, rotateY: 0, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      style={{ transformStyle: variant === "depth" ? "preserve-3d" : undefined, ...style }}
    >
      {variant === "depth" && (
        <>
          <span className="pointer-events-none absolute inset-x-1 top-1 h-[38%] rounded-full bg-white/55 blur-[1px]" />
          <span className="pointer-events-none absolute bottom-1 right-1 size-1.5 rounded-full bg-white/80 shadow-sm" />
        </>
      )}
      <Icon icon={icon} className={`${s.icon} ${v.icon} ${iconClassName ?? ""}`} />
    </motion.span>
  );
}

export { AnimatedIcon };
export type { IconEntrance, IconSize, IconVariant, AnimatedIconProps };
