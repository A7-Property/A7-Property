"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bath, BedDouble, Camera, Clock3, Heart, MapPin, Maximize2, ShieldCheck } from "lucide-react";

import { useLanguage } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";
import { MyanmarPrice } from "@/components/ui/myanmar-price";
import { toMyanmarNumber } from "@/lib/myanmar-numbers";
import type { Property } from "@/lib/properties";
import { cn, countLabel } from "@/lib/utils";

interface SearchPropertyCardProps {
  property: Property;
  isFavorite: boolean;
  selected?: boolean;
  onFavoriteToggle: (property: Property) => void;
  onFocus?: (property: Property) => void;
}

function SearchPropertyCard({ property, isFavorite, selected, onFavoriteToggle, onFocus }: SearchPropertyCardProps) {
  const { tx, isMyanmar } = useLanguage();
  const verified = property.verification_status === "verified";
  const href = `/properties/${property.id}`;

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-[22px] border bg-[#F8FBFF] shadow-[0_8px_26px_rgba(23,43,63,.075)] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-[#D4A574] hover:shadow-[0_20px_45px_rgba(23,43,63,.13)] sm:grid sm:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[43%_minmax(0,1fr)]",
        selected ? "border-[#123B73] ring-2 ring-[#123B73]/15" : "border-[#172B3F]/9",
      )}
      onMouseEnter={() => onFocus?.(property)}
      onFocus={() => onFocus?.(property)}
    >
      <Link href={href} className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#123B73]/35" aria-label={tx(`View details for ${property.title}`, `${property.title} အသေးစိတ်ကြည့်ရန်`)} />

      <div className="relative min-h-[205px] overflow-hidden bg-[#DCEBFF] sm:min-h-[260px]">
        <Image src={property.images[0]} alt={property.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 220px, 360px" className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {verified && <TrustBadge>{tx("Verified", "စိစစ်ပြီး")}</TrustBadge>}
          <span className="rounded-lg border border-white/70 bg-[#202124]/78 px-2.5 py-1.5 text-[11px] font-semibold text-white backdrop-blur"><Camera className="mr-1.5 inline size-3.5" />{property.images.length} {tx("photos", "ဓာတ်ပုံ")}</span>
        </div>
        <Button variant="ghost" size="icon" className={cn("absolute right-3 top-3 z-20 size-11 border border-white/80 bg-white/94 shadow-sm hover:bg-white", isFavorite ? "text-[#123B73]" : "text-[#101828]")} aria-label={isFavorite ? tx(`Remove ${property.title} from saved homes`, `${property.title} ကို သိမ်းထားမှုမှဖယ်ရန်`) : tx(`Save ${property.title}`, `${property.title} ကို သိမ်းရန်`)} aria-pressed={isFavorite} onClick={() => onFavoriteToggle(property)}>
          <Heart className="size-5" fill={isFavorite ? "currentColor" : "none"} />
        </Button>
      </div>

      <div className="flex min-w-0 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <MyanmarPrice price={property.price} purpose={property.purpose} className="text-[20px] font-semibold text-[#172B3F]" />
              {property.purpose === "rent" && <span className="text-xs font-medium text-[#667085]">/ {tx("month", "လ")}</span>}
            </div>
            <p className="mt-0.5 text-[11px] text-[#7A7F86]">{isMyanmar ? `${toMyanmarNumber(new Intl.NumberFormat("en-US").format(property.price))} ကျပ်` : `${new Intl.NumberFormat("en-US").format(property.price)} MMK`} {property.purpose === "rent" ? tx("per month", "တစ်လလျှင်") : tx("total", "စုစုပေါင်း")}</p>
          </div>
          <span className="shrink-0 rounded-lg bg-[#F1F6FF] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[.08em] text-[#123B73]">{property.purpose === "rent" ? tx("For rent", "ငှားရန်") : tx("For sale", "ရောင်းရန်")}</span>
        </div>

        <h2 className="mt-3 line-clamp-2 text-[16px] font-semibold leading-6 tracking-[-0.025em] text-[#172B3F] group-hover:text-[#003F91]">{property.title}</h2>
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-[#667085]"><MapPin className="size-4 shrink-0 text-[#123B73]" /><span className="truncate">{property.township}, {property.city}</span></p>

        <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-2 border-y border-[#E4E9EF] py-3 text-xs font-medium text-[#526172]">
          <span className="inline-flex items-center gap-1.5"><BedDouble className="size-[18px] text-[#667085]" />{tx(countLabel(property.bedrooms, "bed"), `အိပ်ခန်း ${property.bedrooms}`)}</span>
          <span className="inline-flex items-center gap-1.5"><Bath className="size-[18px] text-[#667085]" />{tx(countLabel(property.bathrooms, "bath"), `ရေချိုးခန်း ${property.bathrooms}`)}</span>
          <span className="inline-flex items-center gap-1.5"><Maximize2 className="size-4 text-[#667085]" />{new Intl.NumberFormat("en-US").format(property.area_sqft)} sqft</span>
        </div>

        <div className="mt-3.5 flex items-center justify-between gap-3 rounded-xl border border-[#D9E8FF] bg-[linear-gradient(135deg,#F7FAFF,#EEF5FF)] px-3.5 py-2.5 text-[11px]">
          <span className="inline-flex min-w-0 items-center gap-2 font-semibold text-[#285B3B]"><ShieldCheck className="size-[18px] shrink-0" /><span className="truncate">{property.owner.phone_verified ? tx("Phone contact verified", "ဖုန်းဆက်သွယ်ရန် စိစစ်ပြီး") : tx("Phone contact not verified", "ဖုန်းဆက်သွယ်ရန် မစိစစ်ရသေး")}</span></span>
          <span className="shrink-0 font-semibold text-[#123B73]">{verified ? tx("Listing verified", "အိမ်စိစစ်ပြီး") : tx("Check status", "အခြေအနေကြည့်ရန်")}</span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-3.5 text-[11px] font-medium text-[#667486]">
          <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5" />{tx(`Typical reply: ~${property.owner.response_time_minutes} min`, `ပုံမှန်အကြောင်းပြန်ချိန် ~${property.owner.response_time_minutes} မိနစ်`)}</span>
          <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-[#123B73]">{tx("View details", "အသေးစိတ်ကြည့်ရန်")}<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
        </div>
      </div>
    </article>
  );
}

function TrustBadge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/80 bg-white/94 px-2.5 py-1.5 text-[11px] font-semibold text-[#123B73] shadow-sm backdrop-blur"><ShieldCheck className="size-4" />{children}</span>;
}

export { SearchPropertyCard };
