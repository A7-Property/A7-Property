"use client";

import { Bath, BedDouble, Heart, Maximize2, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useLanguage } from "@/components/i18n/language-provider";
import { MobileAppHeader } from "@/components/layout/mobile-app-header";
import { AnimatedAssetIcon } from "@/components/ui/animated-asset-icon";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import { formatPropertyPrice, type Property } from "@/lib/properties";
import { cn } from "@/lib/utils";
import { useSavedHomes } from "@/hooks/use-saved-homes";

type SavedTab = "all" | "buy" | "rent";

function SavedJourney({ properties }: { properties: Property[] }) {
  const { isMyanmar, tx } = useLanguage();
  const reduceMotion = useReducedMotion();
  const { savedIds, toggleSaved } = useSavedHomes();
  const [tab, setTab] = useState<SavedTab>("all");

  const savedHomes = useMemo(
    () => savedIds
      .map((id) => properties.find((property) => property.id === id))
      .filter((property): property is Property => Boolean(property)),
    [properties, savedIds],
  );

  const visibleHomes = useMemo(
    () => savedHomes.filter((property) => tab === "all" || (tab === "buy" ? property.purpose === "sale" : property.purpose === "rent")),
    [savedHomes, tab],
  );

  function removeSaved(property: Property) {
    void toggleSaved(property);
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-[118px] text-[#1B1B1F] lg:pb-12">
      <header className="a7-header-surface a7-safe-top fixed inset-x-0 top-0 z-50">
        <MobileAppHeader />
      </header>

      <motion.main initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }} className="mx-auto w-full max-w-[760px] px-4 pt-[88px] sm:px-6" aria-labelledby="saved-homes-title">
        <motion.section initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.38, delay: reduceMotion ? 0 : 0.06, ease: [0.22, 1, 0.36, 1] }} className="flex items-start justify-between gap-3 pb-4 pt-1">
          <div className="min-w-0 pt-1">
            <h1 id="saved-homes-title" className="text-[34px] font-bold leading-[1.16] tracking-[-.045em] text-[#1B1B1F] sm:text-[38px]">{tx("Saved Homes", "သိမ်းထားသောအိမ်များ")}</h1>
            <p className="mt-2 text-[16px] leading-6 text-[#424655] sm:text-[17px]">{tx("Properties you want to revisit", "ပြန်လည်ကြည့်ရှုလိုသောအိမ်များ")}</p>
          </div>
          <AnimatedAssetIcon src="/icons/a7-saved-home-3d.png" width={72} height={72} hover="float" className="size-[72px]" imageClassName="drop-shadow-[0_10px_14px_rgba(18,59,115,.18)]" />
        </motion.section>

        <motion.div initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.38, delay: reduceMotion ? 0 : 0.12, ease: [0.22, 1, 0.36, 1] }} className="mb-6">
          <div className="grid w-full grid-cols-3 rounded-xl bg-[#EFEDF1] p-1" role="tablist" aria-label={tx("Saved home category", "သိမ်းထားသောအိမ် အမျိုးအစား")}>
            <SavedTabButton active={tab === "all"} label={tx("All", "အားလုံး")} onClick={() => setTab("all")} />
            <SavedTabButton active={tab === "buy"} label={tx("Buy", "ဝယ်ရန်")} onClick={() => setTab("buy")} />
            <SavedTabButton active={tab === "rent"} label={tx("Rent", "ငှားရန်")} onClick={() => setTab("rent")} />
          </div>
        </motion.div>

        {visibleHomes.length > 0 ? (
          <section className="space-y-6" aria-label={tx("Saved home list", "သိမ်းထားသောအိမ်စာရင်း")}>
            <AnimatePresence initial={false} mode="popLayout">
              {visibleHomes.map((property, index) => (
                <motion.div key={property.id} layout initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -10, scale: 0.98 }} transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : 0.16 + index * 0.055, ease: [0.22, 1, 0.36, 1] }}>
                  <SavedHomeCard property={property} isMyanmar={isMyanmar} tx={tx} priority={index < 2} onRemove={removeSaved} />
                </motion.div>
              ))}
            </AnimatePresence>
          </section>
        ) : (
          <motion.section initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reduceMotion ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }} className="flex min-h-[360px] flex-col items-center justify-center px-5 text-center">
            <AnimatedAssetIcon src="/icons/a7-shortlist-empty-3d.png" width={88} height={88} hover="float" className="size-[88px]" imageClassName="drop-shadow-[0_10px_16px_rgba(18,59,115,.18)]" />
            <h2 className="mt-5 text-[22px] font-semibold tracking-[-.03em]">{tx("No saved homes yet", "သိမ်းထားသောအိမ် မရှိသေးပါ")}</h2>
            <p className="mt-2 max-w-[300px] text-[15px] leading-6 text-[#424655]">{tx("Keep track of the properties you love by tapping the heart icon.", "နှစ်သက်သောအိမ်များကို နှလုံးပုံကိုနှိပ်ပြီး သိမ်းထားနိုင်ပါသည်။")}</p>
            <Link href="/search?purpose=rent" className="mt-6 inline-flex h-11 items-center rounded-full bg-[#0053D2] px-5 text-[13px] font-semibold text-white shadow-[0_8px_18px_rgba(0,83,210,.18)]">{tx("Explore properties", "အိမ်များရှာဖွေရန်")}</Link>
          </motion.section>
        )}
      </motion.main>
    </div>
  );
}

function SavedTabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 w-full items-center justify-center rounded-lg px-3 text-[15px] font-medium leading-none transition-[background-color,color,box-shadow]",
        active ? "bg-white text-[#1B1B1F] shadow-[0_1px_3px_rgba(0,0,0,.12)]" : "text-[#424655] hover:bg-white/60",
      )}
    >
      {label}
    </button>
  );
}

function SavedHomeCard({ property, isMyanmar, tx, priority, onRemove }: { property: Property; isMyanmar: boolean; tx: (english: string, myanmar: string) => string; priority: boolean; onRemove: (property: Property) => void }) {
  const price = formatPropertyPrice(property, isMyanmar ? "my" : "en");
  const isVerified = property.verification_status === "verified";

  return (
    <article className="group overflow-hidden rounded-xl bg-white shadow-[0_2px_10px_rgba(27,27,31,.08)] transition-transform duration-200 active:scale-[.985]">
      <div className="relative aspect-[16/10] overflow-hidden bg-[#EFEDF1]">
        <Link href={`/properties/${property.id}`} className="absolute inset-0 z-10" aria-label={tx(`View ${property.title}`, `${property.title} ကိုကြည့်ရန်`)} />
        <ProgressiveImage src={property.images[0]} alt={property.title} fill priority={priority} sizes="(max-width: 800px) calc(100vw - 32px), 712px" className="object-cover transition-transform duration-700 group-hover:scale-[1.035]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/[.44] via-black/[.08] to-transparent" />
        {isVerified && <span className="absolute left-3 top-3 z-20 inline-flex h-7 items-center justify-center gap-1.5 rounded-md bg-white/90 px-2.5 font-semibold uppercase tracking-[.08em] text-[#1B1B1F] shadow-sm backdrop-blur-md"><ShieldCheck className="size-3.5 shrink-0 text-[#059669]" fill="currentColor" strokeWidth={2.3} /><span className="relative top-px inline-flex items-center text-[12px] leading-none">{tx("Verified", "စိစစ်ပြီး")}</span></span>}
        <button type="button" onClick={() => onRemove(property)} aria-label={tx(`Remove ${property.title} from saved homes`, `${property.title} ကို သိမ်းထားမှုမှဖယ်ရန်`)} className="absolute right-3 top-3 z-20 grid size-12 place-items-center rounded-full bg-white/90 text-[#0053D2] shadow-sm backdrop-blur-md transition-transform active:scale-95">
          <Heart className="size-5 fill-current" />
        </button>
      </div>

      <div className="p-4 sm:p-5">
        <p className="text-[20px] font-bold leading-7 tracking-[-.04em] text-[#1B1B1F]">{price}{property.purpose === "rent" && <span className="ml-1.5 text-[13px] font-medium tracking-normal text-[#424655]">{tx("/ month", "/လ")}</span>}</p>
        <Link href={`/properties/${property.id}`} className="mt-1 block">
          <h2 className="truncate text-[16px] font-semibold leading-6 tracking-[-.03em] text-[#1B1B1F] transition-colors hover:text-[#0053D2]">{property.title}</h2>
          <p className="mt-0.5 truncate text-[14px] leading-5 text-[#424655]">{property.township}, {property.city}</p>
        </Link>

        <div className="mt-3 grid grid-cols-3 items-center border-t border-[#E1E2EE] pt-3 text-[#424655]" aria-label={tx("Property details", "အိမ်အသေးစိတ်")}>
          <PropertyFact icon={BedDouble} label={tx(`${property.bedrooms} ${property.bedrooms === 1 ? "Bed" : "Beds"}`, `${property.bedrooms} အိပ်ခန်း`)} bordered />
          <PropertyFact icon={Bath} label={tx(`${property.bathrooms} ${property.bathrooms === 1 ? "Bath" : "Baths"}`, `${property.bathrooms} ရေချိုးခန်း`)} bordered />
          <PropertyFact icon={Maximize2} label={tx(`${property.area_sqft.toLocaleString()} sqft`, `${property.area_sqft.toLocaleString()} စတုရန်းပေ`)} />
        </div>
      </div>
    </article>
  );
}

function PropertyFact({ icon: Icon, label, bordered = false }: { icon: typeof BedDouble; label: string; bordered?: boolean }) {
  return <span className={cn("inline-flex h-6 min-w-0 items-center justify-center gap-1.5 text-[12px] font-medium leading-none", bordered && "border-r border-[#C2C6D8]")}><Icon className="size-[18px] shrink-0" strokeWidth={1.8} /><span className="min-w-0 truncate">{label}</span></span>;
}

export { SavedJourney };
