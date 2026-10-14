"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Heart, ImageIcon, Scale } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useLanguage } from "@/components/i18n/language-provider";
import { PropertyCardBody } from "@/components/property/property-card-system";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import { a7Motion } from "@/lib/motion";
import { listingVerificationLabel, propertyTypeLabels, propertyTypeLabelsMy, type Property } from "@/lib/properties";
import { cn } from "@/lib/utils";

interface MobileSearchCardProps {
  property: Property;
  saved: boolean;
  onToggleSaved: (property: Property) => void;
  onOpen?: () => void;
  priority?: boolean;
  compared?: boolean;
  compareDisabled?: boolean;
  onToggleCompare?: (property: Property) => void;
  variant?: "feature" | "compact";
}

function MobileSearchCard({ property, saved, onToggleSaved, onOpen, priority = false, compared = false, compareDisabled = false, onToggleCompare, variant = "feature" }: MobileSearchCardProps) {
  const { isMyanmar, tx } = useLanguage();
  const reduceMotion = useReducedMotion();
  const href = `/properties/${property.id}`;
  const viewLabel = tx(`View ${property.title} (${property.id})`, `${property.title} (${property.id}) ကိုကြည့်ရန်`);
  const [imageIndex, setImageIndex] = useState(0);
  const propertyTypeLabel = isMyanmar
    ? propertyTypeLabelsMy[property.property_type]
    : propertyTypeLabels[property.property_type];

  function toggleSaved() {
    if (!reduceMotion && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(10);
    onToggleSaved(property);
  }

  function previousImage() {
    setImageIndex((current) => (current - 1 + property.images.length) % property.images.length);
  }

  function nextImage() {
    setImageIndex((current) => (current + 1) % property.images.length);
  }

  if (variant === "compact") {
    return (
      <motion.article initial={reduceMotion ? false : { opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-30px" }} transition={reduceMotion ? { duration: 0 } : a7Motion.slow} className="group grid min-h-[205px] grid-cols-[minmax(0,1.05fr)_minmax(138px,.95fr)] overflow-hidden rounded-[24px] border border-[#D0DEF0] bg-[#F8FBFF] shadow-[0_10px_28px_rgba(26,52,88,.07)]">
        <PropertyCardBody property={property} variant="explore" showTrust showLocationIcon={false} onOpen={onOpen} className="h-full p-4" titleClassName="!text-[16px]" priceClassName="!text-[20px] !text-[#101828]" factsClassName="!gap-2" />
        <div className="relative min-h-[205px] overflow-hidden bg-[#DCEBFF]">
          <Link href={href} onClick={onOpen} className="absolute inset-0 z-10" aria-label={viewLabel} />
          <ProgressiveImage src={property.images[0]} alt={property.title} fill priority={priority} sizes="(max-width: 640px) 45vw, 280px" className="object-cover transition-transform duration-500 group-hover:scale-[1.025]" />
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white via-white/45 to-transparent" />
          <motion.button type="button" onClick={toggleSaved} aria-label={saved ? tx(`Remove ${property.title} from saved homes`, `${property.title} ကို သိမ်းထားမှုမှဖယ်ရန်`) : tx(`Save ${property.title}`, `${property.title} ကို သိမ်းရန်`)} aria-pressed={saved} animate={reduceMotion ? undefined : saved ? { scale: [1, 1.2, 1] } : { scale: 1 }} transition={reduceMotion ? { duration: 0 } : a7Motion.base} className="absolute right-3 top-3 z-20 grid size-11 place-items-center rounded-full border border-white/85 bg-[#F8FBFF]/92 text-[#101828] shadow-sm backdrop-blur-md"><Heart className={cn("size-[19px]", saved && "fill-current text-[#123B73]")} /></motion.button>
          {onToggleCompare && <button type="button" onClick={() => onToggleCompare(property)} disabled={compareDisabled} aria-pressed={compared} aria-label={compared ? tx(`Remove ${property.title} from comparison`, `${property.title} ကို နှိုင်းယှဉ်မှုမှဖယ်ရန်`) : tx(`Add ${property.title} to comparison`, `${property.title} ကို နှိုင်းယှဉ်ရန်ထည့်ရန်`)} className={cn("absolute bottom-3 right-3 z-20 grid size-11 place-items-center rounded-full border border-white/85 bg-[#F8FBFF]/92 text-[#123B73] shadow-sm backdrop-blur-md", compared && "bg-[#123B73] text-white", compareDisabled && "cursor-not-allowed opacity-45")}>{compared ? <Check className="size-4" /> : <Scale className="size-[18px]" />}</button>}
        </div>
      </motion.article>
    );
  }

  return (
    <motion.article initial={reduceMotion ? false : { opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-24px" }} transition={reduceMotion ? { duration: 0 } : a7Motion.slow} className="group relative overflow-hidden rounded-[26px] border border-[#D0DEF0] bg-[#F8FBFF] shadow-[0_14px_34px_rgba(26,52,88,.09)] lg:grid lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,.45fr)]">
      <div className="relative aspect-[1.92/1] overflow-hidden bg-[#DCEBFF] lg:aspect-auto lg:min-h-[420px]">
        <Link href={href} onClick={onOpen} className="absolute inset-0 z-10" aria-label={viewLabel} />
        <ProgressiveImage src={property.images[imageIndex]} alt={`${property.title}, photo ${imageIndex + 1}`} fill priority={priority} sizes="(max-width: 1023px) calc(100vw - 32px), 860px" className="object-cover transition-transform duration-500 group-hover:scale-[1.015]" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/12 to-transparent" aria-hidden="true" />
        <span className="absolute left-4 top-4 z-20 inline-flex h-9 items-center gap-1.5 rounded-full border border-white/85 bg-[#F8FBFF]/92 px-3.5 text-[9px] font-semibold text-[#101828] shadow-sm backdrop-blur-md"><Check className="size-3.5 rounded-full bg-[#123B73] p-0.5 text-white" />{property.verification_status === "verified" ? tx(`Verified ${propertyTypeLabel}`, `စိစစ်ပြီး ${propertyTypeLabel}`) : tx(listingVerificationLabel(property), property.verification_status === "pending" ? "စိစစ်ဆဲ" : "မစိစစ်ရသေး")}</span>
        <motion.button type="button" onClick={toggleSaved} aria-label={saved ? tx(`Remove ${property.title} from saved homes`, `${property.title} ကို သိမ်းထားမှုမှဖယ်ရန်`) : tx(`Save ${property.title}`, `${property.title} ကို သိမ်းရန်`)} aria-pressed={saved} animate={reduceMotion ? undefined : saved ? { scale: [1, 1.2, 1] } : { scale: 1 }} transition={reduceMotion ? { duration: 0 } : a7Motion.base} className="absolute right-4 top-4 z-20 grid size-12 place-items-center rounded-full border border-white/85 bg-[#F8FBFF]/92 text-[#101828] shadow-sm backdrop-blur-md"><Heart className={cn("size-5", saved && "fill-current text-[#123B73]")} /></motion.button>

        {property.images.length > 1 && <>
          <button type="button" onClick={previousImage} className="absolute left-4 top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-[#F8FBFF]/80 text-[#101828] shadow-sm backdrop-blur-md" aria-label={tx("Previous property photo", "ယခင်အိမ်ပုံ")}><ChevronLeft className="size-5" /></button>
          <button type="button" onClick={nextImage} className="absolute right-4 top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-[#F8FBFF]/80 text-[#101828] shadow-sm backdrop-blur-md" aria-label={tx("Next property photo", "နောက်အိမ်ပုံ")}><ChevronRight className="size-5" /></button>
        </>}
        <span className="absolute bottom-4 right-4 z-20 grid h-9 grid-cols-[16px_auto] place-content-center items-center gap-2 rounded-[12px] bg-[#F8FBFF]/88 px-3 text-[12px] font-semibold leading-none text-[#101828] shadow-sm backdrop-blur-md"><ImageIcon className="size-4" /><span className="relative top-px leading-none">{imageIndex + 1}/{property.images.length}</span></span>
      </div>

      <PropertyCardBody property={property} variant="explore" showLocationIcon={false} onOpen={onOpen} className="p-4 lg:p-7" titleClassName="!text-[16px] !leading-6 lg:!text-[20px]" priceClassName="!text-[20px] !text-[#101828] lg:!text-[24px]" factsClassName="!gap-2" />
    </motion.article>
  );
}

export { MobileSearchCard };
