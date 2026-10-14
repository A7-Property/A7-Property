"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Heart, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { useLanguage } from "@/components/i18n/language-provider";
import { PropertyCardBody } from "@/components/property/property-card-system";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import { a7DesignTokens } from "@/lib/design-system";
import { a7Motion } from "@/lib/motion";
import { type Property } from "@/lib/properties";
import { cn } from "@/lib/utils";

const mobileTheme = a7DesignTokens.color;

function SectionHeading({
  eyebrow,
  title,
  action,
  href,
}: {
  eyebrow?: string;
  title: string;
  action?: string;
  href?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={reduceMotion ? { duration: 0 } : a7Motion.slow}
      className="flex items-end justify-between gap-4"
    >
      <div>
        {eyebrow && <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#123B73]">{eyebrow}</p>}
        <h2 className="text-[25px] font-semibold leading-[1.18] tracking-[-0.04em] text-a7-navy sm:text-[30px]">{title}</h2>
      </div>
      {action && href && (
        <Link href={href} className="inline-flex h-11 shrink-0 items-center gap-1 text-[12px] font-semibold text-[#123B73]">
          {action}<ArrowRight className="size-4" />
        </Link>
      )}
    </motion.div>
  );
}

function TrustPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("a7-glass inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[9px] font-semibold text-a7-blue", className)}>
      <ShieldCheck className="size-3.5" />{children}
    </span>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn("grid rounded-[var(--radius-control)] bg-[#DCEBFF] p-1", className)} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn("h-11 rounded-[11px] px-4 text-[12px] font-semibold transition-[background-color,color,box-shadow] duration-[var(--duration-base)]", selected ? "bg-white text-a7-blue shadow-[var(--shadow-hairline)]" : "text-a7-muted hover:text-a7-navy")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

interface MobilePropertyCardProps {
  property: Property;
  saved?: boolean;
  onToggleSaved?: (property: Property) => void;
  variant?: "feature" | "compact";
  priority?: boolean;
  className?: string;
  onOpen?: () => void;
  compared?: boolean;
  compareDisabled?: boolean;
  onToggleCompare?: (property: Property) => void;
}

function MobilePropertyCard({ property, saved = false, onToggleSaved, variant = "feature", priority = false, className, onOpen }: MobilePropertyCardProps) {
  const { tx } = useLanguage();
  const reduceMotion = useReducedMotion();

  function toggleFavorite() {
    if (!reduceMotion && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(10);
    onToggleSaved?.(property);
  }

  if (variant === "compact") {
    return (
      <motion.article initial={reduceMotion ? false : { opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-24px" }} whileHover={reduceMotion ? undefined : { y: -2 }} transition={reduceMotion ? { duration: 0 } : a7Motion.slow} className={cn("grid min-h-[205px] min-w-[320px] grid-cols-[42%_1fr] overflow-hidden rounded-[var(--radius-card)] border border-a7-line bg-[#F8FBFF] shadow-[var(--shadow-soft)] sm:min-w-0", className)}>
        <div className="relative min-h-[205px] overflow-hidden bg-[#D0DEF0]">
          <Link href={`/properties/${property.id}`} onClick={onOpen} className="absolute inset-0 z-10" aria-label={`View ${property.title}`} />
          <ProgressiveImage src={property.images[0]} alt={property.title} fill priority={priority} sizes="118px" className="object-cover" />
          {onToggleSaved && <motion.button type="button" onClick={toggleFavorite} animate={reduceMotion ? undefined : saved ? { scale: [1, 1.25, 1] } : { scale: 1 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} className="absolute right-2.5 top-2.5 z-20 grid size-11 place-items-center rounded-full bg-white/92 text-[#123B73] shadow-sm backdrop-blur" aria-label={saved ? `Remove ${property.title} from saved homes` : `Save ${property.title}`} aria-pressed={saved}><Heart className={cn("size-4", saved && "fill-current")} /></motion.button>}
        </div>
        <PropertyCardBody property={property} variant="explore" showTrust onOpen={onOpen} className="h-full p-3.5" priceClassName="!text-[#101828]" />
      </motion.article>
    );
  }

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      whileHover={reduceMotion ? undefined : { y: -2, boxShadow: "0 2px 5px rgba(16,24,40,.05), 0 16px 40px rgba(16,24,40,.09)" }}
      whileTap={reduceMotion ? undefined : { scale: 0.998 }}
      transition={reduceMotion ? { duration: 0 } : a7Motion.slow}
      style={{ willChange: "transform" }}
      className={cn("group relative min-w-[300px] overflow-hidden rounded-[var(--radius-card)] border border-a7-line bg-[#F8FBFF] shadow-[var(--shadow-soft)] sm:min-w-0", className)}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#D0DEF0]">
        <Link href={`/properties/${property.id}`} onClick={onOpen} className="absolute inset-0 z-10" aria-label={`View ${property.title}`} />
        <ProgressiveImage src={property.images[0]} alt={property.title} fill priority={priority} sizes="(max-width: 639px) 86vw, (max-width: 1023px) 46vw, 360px" className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]" />
        <div className="absolute inset-0 bg-gradient-to-t from-a7-navy/55 via-transparent to-black/5" />
        <motion.div initial={reduceMotion ? false : { opacity: 0, y: -6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: reduceMotion ? 0 : 0.14, duration: 0.32 }} className="absolute left-3.5 top-3.5"><TrustPill>{property.verification_status === "verified" ? tx("Verified property", "စိစစ်ထားသောအိမ်") : tx(property.verification_status === "pending" ? "Verification pending" : "Unverified listing", property.verification_status === "pending" ? "စိစစ်ဆဲ" : "မစိစစ်ရသေး")}</TrustPill></motion.div>
        {onToggleSaved && (
          <motion.button
            type="button"
            onClick={toggleFavorite}
            aria-label={saved ? `Remove ${property.title} from saved homes` : `Save ${property.title}`}
            aria-pressed={saved}
            animate={reduceMotion ? undefined : saved ? { scale: [1, 1.25, 1] } : { scale: 1 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="a7-glass absolute right-3.5 top-3.5 z-20 grid size-11 place-items-center rounded-full text-a7-blue transition-transform duration-200 active:scale-95"
          >
            <Heart className={cn("size-5 transition-transform", saved && "scale-110 fill-current")} />
          </motion.button>
        )}
        <div className="absolute inset-x-3.5 bottom-3.5 z-20 flex items-end justify-end gap-3 text-white">
          <span className="rounded-full bg-[#123B73]/88 px-2.5 py-1 text-[9px] font-semibold backdrop-blur-md">{property.purpose === "rent" ? tx("For rent", "ငှားရန်") : tx("For sale", "ရောင်းရန်")}</span>
        </div>
      </div>
      <PropertyCardBody property={property} variant="explore" onOpen={onOpen} className="p-4 sm:p-5" />
    </motion.article>
  );
}

export { MobilePropertyCard, SectionHeading, SegmentedControl, TrustPill, mobileTheme };
