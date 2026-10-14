"use client";

import { Bath, BedDouble, Building2, Clock3, MapPin, Maximize2, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { useLanguage } from "@/components/i18n/language-provider";
import { formatPropertyPrice, listingVerificationLabel, propertyTypeLabels, propertyTypeLabelsMy, type Property } from "@/lib/properties";
import { cn } from "@/lib/utils";

type PropertyCardVariant = "featured" | "explore" | "saved";

interface PropertyCardBodyProps {
  property: Property;
  variant?: PropertyCardVariant;
  href?: string;
  onOpen?: () => void;
  showTrust?: boolean;
  updatedLabel?: string;
  footer?: ReactNode;
  className?: string;
  titleClassName?: string;
  priceClassName?: string;
  factsClassName?: string;
  showLocationIcon?: boolean;
}

function PropertyCardBody({
  property,
  variant = "explore",
  href = `/properties/${property.id}`,
  onOpen,
  showTrust = false,
  updatedLabel,
  footer,
  className,
  titleClassName,
  priceClassName,
  factsClassName,
  showLocationIcon = true,
}: PropertyCardBodyProps) {
  const { isMyanmar, tx } = useLanguage();
  const price = formatPropertyPrice(property, isMyanmar ? "my" : "en");
  const featured = variant === "featured";
  const saved = variant === "saved";
  const propertyType = isMyanmar
    ? propertyTypeLabelsMy[property.property_type]
    : propertyTypeLabels[property.property_type];

  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      {showTrust && <PropertyTrustBadge status={property.verification_status} label={property.verification_status === "verified" ? tx(`Verified ${propertyType}`, `စိစစ်ပြီး ${propertyType}`) : tx(listingVerificationLabel(property), property.verification_status === "pending" ? "စိစစ်ဆဲ" : "မစိစစ်ရသေး")} />}

      {featured && (
        <span className="mb-3 inline-flex h-8 w-fit items-center gap-1.5 rounded-full bg-[#DCEBFF] px-3 text-[9px] font-semibold text-[#101828]">
          <Building2 className="size-4 text-[#4DA3FF]" />{propertyType}<span className="text-[#667085]">•</span><span className="text-[#4DA3FF]">{property.purpose === "rent" ? tx("For Rent", "ငှားရန်") : tx("For Sale", "ရောင်းရန်")}</span>
        </span>
      )}

      <Link href={href} onClick={onOpen} className={cn(showTrust && "mt-3")}>
        <h3 className={cn("line-clamp-2 text-[16px] font-semibold leading-5 tracking-[-0.028em] text-[#101828] transition-colors hover:text-[#4DA3FF]", titleClassName)}>{property.title}</h3>
      </Link>

      <p className={cn("text-[20px] font-semibold tracking-[-0.03em] text-[#4DA3FF]", featured || saved ? "mt-3" : "mt-2.5", priceClassName)}>{price}<span className="ml-1 text-[8px] font-normal tracking-normal text-[#667085]">{property.purpose === "rent" ? tx("/ month", "/လ") : ""}</span></p>

      <p className={cn("flex min-w-0 items-center text-[#667085]", showLocationIcon && "gap-1.5", featured ? "mt-3 text-[12px]" : saved ? "mt-2.5 text-[10px]" : "mt-2 text-[9px]")}>{showLocationIcon && <MapPin className={cn("shrink-0 text-[#4DA3FF]", featured ? "size-5" : saved ? "size-4" : "size-3.5")} />}<span className="truncate">{property.township}, {property.city}</span></p>

      <PropertyCardFacts property={property} variant={variant} className={factsClassName} />

      {featured && property.amenities.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {property.amenities.slice(0, 4).map((amenity) => <span key={amenity} className="inline-flex h-8 items-center rounded-full border border-[#D0DEF0] bg-[#F8FBFF] px-3 text-[9px] font-medium text-[#101828]">{amenity}</span>)}
        </div>
      )}

      {updatedLabel && <p className={cn("text-right text-[#667085]", featured ? "mt-4 text-[10px]" : saved ? "mt-3 text-[9px]" : "mt-2.5 text-[8px]")}>{updatedLabel}</p>}
      {footer}
    </div>
  );
}

function PropertyTrustBadge({ label, status }: { label: string; status: Property["verification_status"] }) {
  const Icon = status === "verified" ? ShieldCheck : status === "pending" ? Clock3 : TriangleAlert;
  return <span className={cn("inline-flex h-8 w-fit items-center justify-center gap-1.5 rounded-full border px-3 font-semibold shadow-sm backdrop-blur-md", status === "verified" ? "border-[#0053D2]/15 bg-[#EEF5FF] text-[#0053D2]" : status === "pending" ? "border-[#A15C00]/18 bg-[#FFF7E6] text-[#8A5200]" : "border-[#BA1A1A]/15 bg-[#FFF1F0] text-[#9E1B1B]")}><Icon className="size-3.5 shrink-0" /><span className="relative top-px inline-flex items-center text-[12px] leading-none">{label}</span></span>;
}

function PropertyCardFacts({ property, variant = "explore", className }: { property: Property; variant?: PropertyCardVariant; className?: string }) {
  const { tx } = useLanguage();
  const featured = variant === "featured";
  const saved = variant === "saved";
  const items = [
    { icon: BedDouble, value: property.bedrooms, label: tx(property.bedrooms === 1 ? "Bed" : "Beds", "အိပ်ခန်း") },
    { icon: Bath, value: property.bathrooms, label: tx(property.bathrooms === 1 ? "Bath" : "Baths", "ရေချိုးခန်း") },
    { icon: Maximize2, value: property.area_sqft.toLocaleString(), label: tx("Sqft", "စတုရန်းပေ") },
  ];

  return (
    <div className={cn("grid grid-cols-3", featured ? "mt-5 gap-3" : saved ? "mt-3 gap-1.5" : "mt-3 gap-2", className)}>
      {items.map(({ icon: Icon, value, label }) => (
        <span key={label} className={cn("flex min-w-0 items-center justify-center text-[#101828]", featured ? "h-[68px] gap-3 rounded-[17px] border border-[#D0DEF0] bg-[#DCEBFF] px-4" : saved ? "h-11 gap-1.5 rounded-[12px] border border-[#D0DEF0] bg-[#DCEBFF] px-2.5" : "h-11 gap-1 rounded-[12px] border border-[#C8D9ED] bg-white px-1.5 shadow-sm")}>
          <Icon className={cn("shrink-0 text-[#4DA3FF]", featured ? "size-7" : saved ? "size-4" : "size-4")} />
          <span className={cn("min-w-0", !featured && !saved && "inline-flex items-center gap-0.5 whitespace-nowrap")}><strong className={cn("truncate font-semibold leading-none", featured || saved ? "block" : "inline", featured ? "text-[16px]" : saved ? "text-[11px]" : "text-[11px]")}>{value}</strong><span className={cn("truncate text-[#667085]", featured ? "mt-1 block text-[10px]" : saved ? "mt-1 block text-[7px]" : "inline text-[8px] leading-none")}>{label}</span></span>
        </span>
      ))}
    </div>
  );
}

export { PropertyCardBody, PropertyCardFacts, PropertyTrustBadge };
export type { PropertyCardBodyProps, PropertyCardVariant };
