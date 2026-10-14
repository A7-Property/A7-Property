"use client";

import Image from "next/image";
import Link from "next/link";
import { Bath, BedDouble, Heart, House, Maximize2, ShieldCheck } from "lucide-react";

import { useLanguage } from "@/components/i18n/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, countLabel } from "@/lib/utils";

export interface PropertyCardProperty {
  id: string;
  title: string;
  images: readonly string[];
  city: string;
  township: string;
  price: number;
  currency: string;
  purpose: "rent" | "sale" | string;
  bedrooms: number;
  bathrooms: number;
  area_sqft: number;
  verification_status: "verified" | "pending" | "unverified" | string;
}

export interface PropertyCardProps {
  property?: PropertyCardProperty | null;
  isFavorite?: boolean;
  isLoading?: boolean;
  className?: string;
  onFavoriteToggle?: (property: PropertyCardProperty) => void;
  onSelect?: (property: PropertyCardProperty) => void;
  onEmptyAction?: () => void;
  href?: string;
}

function formatPropertyPrice(property: PropertyCardProperty, lang: "en" | "my" = "en") {
  if (lang === "my") {
    const isSale = property.purpose === "sale";
    const value = isSale ? property.price / 1_000_000 : property.price / 100_000;
    const amount = Number.isInteger(value) ? value.toString() : value.toFixed(1);
    const unit = isSale ? "သန်း" : "သိန်း";
    const myanmarDigits = ["၀", "၁", "၂", "၃", "၄", "၅", "၆", "၇", "၈", "၉"];
    const myAmount = amount.replace(/[0-9]/g, (d) => myanmarDigits[Number(d)]);
    return `${myAmount} ${unit}`;
  }
  const value = property.purpose === "sale"
    ? `${property.price / 1_000_000}M`
    : new Intl.NumberFormat("en-US").format(property.price);
  return `${value} ${property.currency}`;
}

function PropertyCard({
  property,
  isFavorite = false,
  isLoading = false,
  className,
  onFavoriteToggle,
  onSelect,
  onEmptyAction,
  href,
}: PropertyCardProps) {
  const { isMyanmar } = useLanguage();

  if (isLoading) return <PropertyCardSkeleton className={className} />;
  if (!property) return <PropertyCardEmpty className={className} onAction={onEmptyAction} />;

  const isVerified = property.verification_status === "verified";
  const image = property.images[0];
  const priceLabel = formatPropertyPrice(property, isMyanmar ? "my" : "en");

  return (
    <Card
      className={cn(
        "group h-full overflow-hidden rounded-[20px] border-[#101828]/15 shadow-[0_4px_20px_rgba(0,0,0,.08)]",
        "transition-[box-shadow,border-color] duration-300 ease-out hover:border-[#123B73]/40 hover:shadow-[0_6px_22px_rgba(17,24,39,.1)]",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#DCEBFF] sm:aspect-[16/11] lg:aspect-[4/3]">
        {image ? (
          <Image
            src={image}
            alt={property.title}
            fill
            sizes="(max-width: 640px) 84vw, (max-width: 1024px) 46vw, 25vw"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.025]"
          />
        ) : (
          <div className="grid h-full place-items-center text-[#123B73]" aria-label="Property image unavailable">
            <House className="size-9" aria-hidden="true" />
          </div>
        )}

        {isVerified && (
          <Badge variant="verified" className="absolute left-3 top-3">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Verified
          </Badge>
        )}

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute right-3 top-3 size-11 border border-white/70 bg-[#F8FBFF]/90 shadow-sm backdrop-blur-md hover:bg-[#F8FBFF]",
            isFavorite ? "text-[#123B73]" : "text-[#101828]",
          )}
          aria-label={isFavorite ? `Remove ${property.title} from favorites` : `Add ${property.title} to favorites`}
          aria-pressed={isFavorite}
          onClick={() => onFavoriteToggle?.(property)}
        >
          <Heart className="size-[18px]" fill={isFavorite ? "currentColor" : "none"} aria-hidden="true" />
        </Button>
      </div>

      <CardContent className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-[#667085]">
          <span className="truncate">{property.township}, {property.city}</span>
          <span className="ml-auto shrink-0 rounded-full bg-[#EAF4FF] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#123B73]">
            For {property.purpose === "rent" ? "rent" : "sale"}
          </span>
        </div>

        {href ? (
          <Link className="line-clamp-2 min-h-11 text-[15px] font-semibold leading-[1.4] tracking-[-0.02em] hover:text-[#123B73] sm:text-base" href={href}>
            {property.title}
          </Link>
        ) : onSelect ? (
          <button
            className="line-clamp-2 min-h-11 text-left text-[15px] font-semibold leading-[1.4] tracking-[-0.02em] hover:text-[#123B73] sm:text-base"
            onClick={() => onSelect(property)}
          >
            {property.title}
          </button>
        ) : (
          <h3 className="line-clamp-2 min-h-11 text-[16px] font-semibold leading-[1.4] tracking-[-0.02em]">{property.title}</h3>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#B8CCE4] pb-4 text-[11px] text-[#667085]">
          <span className="inline-flex items-center gap-1.5"><BedDouble className="size-4" aria-hidden="true" />{countLabel(property.bedrooms, "bed")}</span>
          <span className="inline-flex items-center gap-1.5"><Bath className="size-4" aria-hidden="true" />{countLabel(property.bathrooms, "bath")}</span>
          <span className="inline-flex items-center gap-1.5"><Maximize2 className="size-3.5" aria-hidden="true" />{new Intl.NumberFormat("en-US").format(property.area_sqft)} sqft</span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            <strong data-type="number" className="block text-[20px] font-semibold tracking-[-0.02em]">{priceLabel}</strong>
            <span className="mt-1 block text-[10px] text-[#667085]">{property.purpose === "rent" ? "per month" : "total price"}</span>
          </div>
          <span className="text-[10px] font-medium text-[#667085]">Updated today</span>
        </div>
      </CardContent>
    </Card>
  );
}

function PropertyCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("h-full overflow-hidden rounded-xl border-[#101828]/15", className)} aria-busy="true" aria-label="Loading property">
      <div className="relative aspect-[4/3] sm:aspect-[16/11] lg:aspect-[4/3]">
        <Skeleton className="absolute inset-0 rounded-none" />
        <Skeleton className="absolute left-3 top-3 h-7 w-20 rounded-full bg-[#F8FBFF]/70" />
        <Skeleton className="absolute right-3 top-3 size-10 rounded-full bg-[#F8FBFF]/70" />
      </div>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex justify-between gap-6"><Skeleton className="h-3 w-28" /><Skeleton className="h-5 w-16 rounded-full" /></div>
        <div className="space-y-2"><Skeleton className="h-4 w-[92%]" /><Skeleton className="h-4 w-[68%]" /></div>
        <div className="flex gap-3 border-b border-[#B8CCE4] pb-4"><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-20" /></div>
        <div className="flex items-end justify-between"><div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-16" /></div><Skeleton className="h-3 w-20" /></div>
      </CardContent>
    </Card>
  );
}

function PropertyCardEmpty({ className, onAction }: { className?: string; onAction?: () => void }) {
  return (
    <Card className={cn("min-h-[390px] items-center justify-center rounded-xl border-dashed border-[#123B73]/30 bg-[#EAF4FF] p-6 text-center", className)}>
      <div className="grid size-14 place-items-center rounded-2xl bg-[#F8FBFF] text-[#123B73] shadow-sm">
        <House className="size-6" aria-hidden="true" />
      </div>
      <h3 className="mt-5 text-base font-semibold">No homes found</h3>
      <p className="mt-2 max-w-56 text-xs leading-5 text-[#667085]">Try a nearby township or adjust your budget to discover more homes.</p>
      {onAction && <Button variant="outline" className="mt-5" onClick={onAction}>Clear filters</Button>}
    </Card>
  );
}

export { PropertyCard, PropertyCardEmpty, PropertyCardSkeleton };
