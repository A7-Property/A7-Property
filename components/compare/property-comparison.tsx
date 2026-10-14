"use client";

import {
  ArrowLeft,
  Bath,
  BedDouble,
  Check,
  ChevronRight,
  ExternalLink,
  MapPin,
  Maximize2,
  Scale,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { A7Brand } from "@/components/brand/a7-brand";
import { useLanguage } from "@/components/i18n/language-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { AnimatedAssetIcon } from "@/components/ui/animated-asset-icon";
import { usePropertyComparison } from "@/hooks/use-property-comparison";
import { formatPropertyPrice, furnitureLabels, furnitureLabelsMy, propertyTypeLabels, propertyTypeLabelsMy, type Property } from "@/lib/properties";
import { cn } from "@/lib/utils";

type ComparisonRow = {
  label: string;
  value: (property: Property) => ReactNode;
  differenceKey: (property: Property) => string | number;
  numeric?: (property: Property) => number;
  best?: "high" | "low";
  bestLabel?: string;
};

type ComparisonGroup = {
  id: string;
  title: string;
  description: string;
  rows: ComparisonRow[];
};

function PropertyComparison({ properties }: { properties: Property[] }) {
  const { isMyanmar, tx } = useLanguage();
  const { comparisonProperties, removeProperty, clearComparison, isReady } = usePropertyComparison(properties);
  const [onlyDifferences, setOnlyDifferences] = useState(false);

  if (!isReady) {
    return <ComparisonLoading tx={tx} />;
  }

  if (comparisonProperties.length < 2) {
    const selected = comparisonProperties[0];
    return (
      <div className="min-h-screen bg-[#FAF8F5] pb-28 text-[#0F1B2D]">
        <ComparisonHeader tx={tx} />
        <main className="mx-auto max-w-[980px] px-4 py-8 sm:px-6 sm:py-14">
          <ComparisonIntro
            eyebrow={selected ? tx("1 home selected", "အိမ် ၁ လုံး ရွေးထားသည်") : tx("Side-by-side review", "ဘေးချင်းယှဉ်သုံးသပ်မှု")}
            title={selected ? tx("Add one more home", "နောက်ထပ်အိမ်တစ်လုံး ထည့်ပါ") : tx("Compare the homes you love", "နှစ်သက်သောအိမ်များကို နှိုင်းယှဉ်ပါ")}
            description={selected
              ? tx("Your first home is ready. Choose another to compare price, space and trust details.", "ပထမအိမ်ကို ရွေးထားပြီးပါပြီ။ ဈေးနှုန်း၊ အကျယ်အဝန်းနှင့် ယုံကြည်မှုအချက်အလက်များ နှိုင်းယှဉ်ရန် နောက်တစ်အိမ်ရွေးပါ။")
              : tx("Shortlist homes while exploring, then review the details that shape a confident decision.", "အိမ်များရှာဖွေရင်း နှိုင်းယှဉ်ရန်ရွေးပြီး ယုံကြည်စွာဆုံးဖြတ်နိုင်မည့် အချက်အလက်များကို တစ်နေရာတည်းတွင် ကြည့်ပါ။")}
          />

          {selected ? (
            <section className="mt-7" aria-label={tx("Selected home", "ရွေးထားသောအိမ်")}>
              <div className="grid gap-3 sm:grid-cols-2">
                <ComparisonHomeCard property={selected} index={0} onRemove={() => removeProperty(selected.id)} tx={tx} isMyanmar={isMyanmar} />
                <AddHomeCard purpose={selected.purpose} tx={tx} />
              </div>
            </section>
          ) : (
            <EmptyComparison tx={tx} />
          )}

          <ComparisonPromise tx={tx} />
        </main>
      </div>
    );
  }

  const comparablePrice = comparisonProperties.every((property) => property.purpose === comparisonProperties[0]?.purpose);
  const groups: ComparisonGroup[] = [
    {
      id: "cost",
      title: tx("Price & availability", "ဈေးနှုန်းနှင့် ရရှိနိုင်မှု"),
      description: tx("Start with the commitment each home requires.", "အိမ်တစ်လုံးစီအတွက် လိုအပ်မည့်ငွေပမာဏကို အရင်ကြည့်ပါ။"),
      rows: [
        {
          label: tx("Price", "ဈေးနှုန်း"),
          value: (property) => (
            <span className="font-semibold text-[#0057D9]">
              {formatPropertyPrice(property, isMyanmar ? "my" : "en")}
              {property.purpose === "rent" && <small className="ml-1 font-normal text-[#667085]">/ {tx("month", "လ")}</small>}
            </span>
          ),
          differenceKey: (property) => `${property.purpose}-${property.price}`,
          numeric: comparablePrice ? (property) => property.price : undefined,
          best: "low",
          bestLabel: tx("Lowest price", "ဈေးအနည်းဆုံး"),
        },
        {
          label: tx("Purpose", "ရည်ရွယ်ချက်"),
          value: (property) => property.purpose === "rent" ? tx("For rent", "ငှားရန်") : tx("For sale", "ရောင်းရန်"),
          differenceKey: (property) => property.purpose,
        },
      ],
    },
    {
      id: "facts",
      title: tx("Home facts", "အိမ်အချက်အလက်"),
      description: tx("Compare the space and layout you will live with every day.", "နေ့စဉ်နေထိုင်ရမည့် အကျယ်အဝန်းနှင့် အခန်းဖွဲ့စည်းပုံကို နှိုင်းယှဉ်ပါ။"),
      rows: [
        { label: tx("Home type", "အိမ်အမျိုးအစား"), value: (property) => tx(propertyTypeLabels[property.property_type], propertyTypeLabelsMy[property.property_type]), differenceKey: (property) => property.property_type },
        { label: tx("Bedrooms", "အိပ်ခန်း"), value: (property) => property.bedrooms, differenceKey: (property) => property.bedrooms, numeric: (property) => property.bedrooms, best: "high", bestLabel: tx("More bedrooms", "အိပ်ခန်းပိုများ") },
        { label: tx("Bathrooms", "ရေချိုးခန်း"), value: (property) => property.bathrooms, differenceKey: (property) => property.bathrooms, numeric: (property) => property.bathrooms, best: "high", bestLabel: tx("More bathrooms", "ရေချိုးခန်းပိုများ") },
        { label: tx("Area", "အကျယ်အဝန်း"), value: (property) => `${new Intl.NumberFormat("en-US").format(property.area_sqft)} sqft`, differenceKey: (property) => property.area_sqft, numeric: (property) => property.area_sqft, best: "high", bestLabel: tx("More space", "အကျယ်ပိုများ") },
        { label: tx("Year built", "ဆောက်လုပ်သည့်နှစ်"), value: (property) => property.year_built ?? tx("Not provided", "မဖော်ပြထားပါ"), differenceKey: (property) => property.year_built ?? "unknown" },
        { label: tx("Floor", "အထပ်"), value: (property) => property.floor ?? tx("Ground", "မြေညီ"), differenceKey: (property) => property.floor ?? "ground" },
      ],
    },
    {
      id: "comfort",
      title: tx("Comfort & trust", "အဆင်ပြေမှုနှင့် ယုံကြည်မှု"),
      description: tx("Review the signals that make a home easier to trust and enjoy.", "အိမ်ကိုယုံကြည်စိတ်ချပြီး နေထိုင်ရအဆင်ပြေစေမည့် အချက်များကို ကြည့်ပါ။"),
      rows: [
        { label: tx("Furniture", "ပရိဘောဂ"), value: (property) => property.furniture === null ? tx("Not provided", "မဖော်ပြထားပါ") : tx(furnitureLabels[property.furniture], furnitureLabelsMy[property.furniture]), differenceKey: (property) => property.furniture ?? "unknown" },
        // An unrated listing shows no score rather than a misleading 0.0, and is
        // excluded from the "higher rating" comparison instead of losing it.
        { label: tx("Rating", "အဆင့်သတ်မှတ်ချက်"), value: (property) => property.rating === null ? tx("Not rated yet", "အဆင့်မသတ်မှတ်ရသေး") : `${property.rating.toFixed(1)} ★`, differenceKey: (property) => property.rating ?? "unrated", numeric: (property) => property.rating ?? Number.NEGATIVE_INFINITY, best: "high", bestLabel: tx("Higher rating", "အဆင့်ပိုမြင့်") },
        {
          label: tx("Verification", "စိစစ်မှု"),
          value: (property) => property.verification_status === "verified"
            ? <span className="inline-flex items-center gap-1.5 text-[#0057D9]"><ShieldCheck className="size-4" />{tx("A7 verified", "A7 စိစစ်ပြီး")}</span>
            : tx("Review pending", "စိစစ်နေဆဲ"),
          differenceKey: (property) => property.verification_status,
        },
        {
          label: tx("Parking", "ကားပါကင်"),
          value: (property) => hasParking(property)
            ? <span className="inline-flex items-center gap-1.5 text-[#287A4B]"><Check className="size-4" />{tx("Included", "ပါဝင်")}</span>
            : tx("Not listed", "မဖော်ပြထား"),
          differenceKey: (property) => String(hasParking(property)),
        },
        { label: tx("Amenities", "အဆင်ပြေမှုများ"), value: (property) => <span className="leading-5">{property.amenities.slice(0, 4).join(" · ")}</span>, differenceKey: (property) => [...property.amenities].sort().join("|") },
      ],
    },
  ];

  const visibleGroups = groups
    .map((group) => ({ ...group, rows: onlyDifferences ? group.rows.filter((row) => hasDifference(row, comparisonProperties)) : group.rows }))
    .filter((group) => group.rows.length > 0);

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-32 text-[#0F1B2D] lg:pb-16">
      <ComparisonHeader tx={tx} />
      <main className="mx-auto max-w-[1180px] px-4 py-7 sm:px-6 sm:py-11 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <ComparisonIntro
            eyebrow={tx(`${comparisonProperties.length} homes selected`, `အိမ် ${comparisonProperties.length} လုံး ရွေးထားသည်`)}
            title={tx("Compare homes", "အိမ်များ နှိုင်းယှဉ်မယ်")}
            description={tx("See the details that matter, without losing sight of the homes you chose.", "သင်ရွေးထားသောအိမ်များကို မျက်ခြည်မပြတ်ဘဲ အရေးကြီးသည့်အချက်များကို ရှင်းရှင်းလင်းလင်းကြည့်ပါ။")}
          />
          <button type="button" onClick={clearComparison} className="inline-flex h-11 w-fit items-center gap-2 rounded-full px-3 text-[11px] font-semibold text-[#667085] transition-colors hover:bg-white hover:text-[#0F1B2D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057D9]" aria-label={tx("Clear all compared homes", "နှိုင်းယှဉ်ထားသောအိမ်အားလုံးရှင်းရန်")}>
            <Trash2 className="size-4" />{tx("Clear all", "အားလုံးရှင်း")}
          </button>
        </div>

        <section className="mt-7" aria-labelledby="selected-homes-title">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="selected-homes-title" className="text-[12px] font-semibold uppercase tracking-[.12em] text-[#667085]">{tx("Your shortlist", "သင်ရွေးထားသောအိမ်များ")}</h2>
            <span className="rounded-full bg-[#EDF4FF] px-2.5 py-1 text-[9px] font-semibold text-[#0057D9]">{tx(`${comparisonProperties.length} selected`, `${comparisonProperties.length} လုံးရွေးထား`)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {comparisonProperties.map((property, index) => (
              <ComparisonHomeCard key={property.id} property={property} index={index} onRemove={() => removeProperty(property.id)} tx={tx} isMyanmar={isMyanmar} />
            ))}
          </div>
        </section>

        <section className="mt-7 overflow-hidden rounded-[22px] border border-[#E2DED7] bg-white shadow-[0_10px_34px_rgba(15,27,45,.06)]" aria-label={tx("Property comparison details", "အိမ်နှိုင်းယှဉ်အချက်အလက်များ")}>
          <div className="flex items-center justify-between gap-4 border-b border-[#E8E4DE] bg-[#FCFBF9] px-4 py-3.5 sm:px-5">
            <div>
              <h2 className="text-[15px] font-semibold tracking-[-0.02em]">{tx("Compare the details", "အသေးစိတ်နှိုင်းယှဉ်မယ်")}</h2>
              <p className="mt-0.5 text-[9px] text-[#667085]">{tx("Values stay aligned with the homes above.", "တန်ဖိုးများသည် အပေါ်ရှိအိမ်အစဉ်အတိုင်း ဖြစ်သည်။")}</p>
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[10px] font-semibold text-[#475467]">
              <span className="hidden sm:inline">{tx("Only differences", "မတူသည်များသာ")}</span>
              <input type="checkbox" checked={onlyDifferences} onChange={(event) => setOnlyDifferences(event.target.checked)} className="peer sr-only" aria-label={tx("Show only differences", "မတူညီသည့်အချက်များသာ ပြရန်")} />
              <span className="relative h-7 w-12 rounded-full bg-[#D8DDE5] transition-colors peer-checked:bg-[#0057D9] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#0057D9]" aria-hidden="true">
                <span className="absolute left-1 top-1 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
              </span>
            </label>
          </div>

          {visibleGroups.length > 0 ? visibleGroups.map((group) => (
            <ComparisonSection key={group.id} group={group} properties={comparisonProperties} />
          )) : (
            <div className="px-5 py-12 text-center">
              <span className="mx-auto grid size-11 place-items-center rounded-full bg-[#EDF4FF] text-[#0057D9]"><Check className="size-5" /></span>
              <h3 className="mt-3 text-[15px] font-semibold">{tx("These homes match on every listed detail", "ဖော်ပြထားသောအချက်အားလုံး တူညီနေပါသည်")}</h3>
              <button type="button" onClick={() => setOnlyDifferences(false)} className="mt-3 inline-flex min-h-11 items-center text-[10px] font-semibold text-[#0057D9]">{tx("Show all details", "အချက်အားလုံးပြမယ်")}</button>
            </div>
          )}
        </section>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <ComparisonPromise tx={tx} compact />
          <Link href="/search?purpose=rent" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] border border-[#CCD9EA] bg-white px-5 text-[11px] font-semibold text-[#0057D9] transition-colors hover:bg-[#EDF4FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057D9]">
            {tx("Explore more homes", "နောက်ထပ်အိမ်များ ရှာမယ်")}<ChevronRight className="size-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}

function ComparisonIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="flex max-w-[760px] flex-col items-start gap-3 sm:flex-row sm:gap-5">
      <AnimatedAssetIcon src="/icons/a7-compare-homes-3d.png" width={72} height={72} hover="float" className="size-16 sm:size-[72px]" imageClassName="drop-shadow-[0_9px_14px_rgba(18,59,115,.18)]" />
      <div className="max-w-[650px]">
        <p className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[.16em] text-[#0057D9]"><Scale className="size-3.5" />{eyebrow}</p>
        <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.05em] sm:text-[46px]">{title}</h1>
        <p className="mt-2 max-w-[580px] text-[11px] leading-5 text-[#667085] sm:text-[12px]">{description}</p>
      </div>
    </div>
  );
}

function ComparisonHomeCard({ property, index, onRemove, tx, isMyanmar }: { property: Property; index: number; onRemove: () => void; tx: (english: string, myanmar: string) => string; isMyanmar: boolean }) {
  return (
    <article className="min-w-0 overflow-hidden rounded-[18px] border border-[#E2DED7] bg-white shadow-[0_6px_22px_rgba(15,27,45,.055)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#E9E7E2] sm:aspect-[16/11]">
        <Image src={property.images[0]} alt={property.title} fill sizes="(max-width: 640px) 46vw, (max-width: 1024px) 45vw, 270px" className="object-cover" />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 to-transparent" />
        <span className="absolute left-2.5 top-2.5 inline-flex items-center rounded-full bg-[#0F1B2D]/78 px-2.5 py-1 text-[8px] font-semibold text-white backdrop-blur-md">{tx(`Home ${index + 1}`, `အိမ် ${index + 1}`)}</span>
        <button type="button" onClick={onRemove} className="absolute right-2 top-2 grid size-11 place-items-center rounded-full bg-white/94 text-[#0F1B2D] shadow-sm transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057D9]" aria-label={tx(`Remove ${property.title}`, `${property.title} ကိုဖယ်ရန်`)}><X className="size-4" /></button>
        {property.verification_status === "verified" && <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/94 px-2 py-1 text-[8px] font-semibold text-[#0057D9]"><ShieldCheck className="size-3" />{tx("Verified", "စိစစ်ပြီး")}</span>}
      </div>
      <div className="p-3 sm:p-4">
        <p className="flex items-center gap-1 truncate text-[8px] text-[#667085]"><MapPin className="size-3 shrink-0 text-[#0057D9]" />{property.township}, {property.city}</p>
        <h2 className="mt-1.5 line-clamp-2 min-h-10 text-[11px] font-semibold leading-[1.15rem] text-[#0F1B2D] sm:text-[14px] sm:leading-5">{property.title}</h2>
        <p className="mt-2 truncate text-[13px] font-semibold tracking-[-0.02em] text-[#0057D9] sm:text-[15px]">{formatPropertyPrice(property, isMyanmar ? "my" : "en")}</p>
        <div className="mt-2.5 grid grid-cols-3 border-t border-[#EEEAE4] pt-2.5 text-[8px] text-[#667085]">
          <span className="inline-flex items-center gap-1"><BedDouble className="size-3.5 text-[#46617D]" />{property.bedrooms}</span>
          <span className="inline-flex items-center justify-center gap-1"><Bath className="size-3.5 text-[#46617D]" />{property.bathrooms}</span>
          <span className="inline-flex items-center justify-end gap-1"><Maximize2 className="size-3.5 text-[#46617D]" />{new Intl.NumberFormat("en-US", { notation: "compact" }).format(property.area_sqft)}</span>
        </div>
        <Link href={`/properties/${property.id}`} className="mt-2.5 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-[12px] bg-[#F3F6FA] text-[9px] font-semibold text-[#0057D9] transition-colors hover:bg-[#EDF4FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057D9]">
          {tx("View home", "အိမ်ကြည့်မယ်")}<ExternalLink className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}

function AddHomeCard({ purpose, tx }: { purpose: Property["purpose"]; tx: (english: string, myanmar: string) => string }) {
  return (
    <Link href={`/search?purpose=${purpose}`} className="group flex min-h-[275px] flex-col items-center justify-center rounded-[18px] border border-dashed border-[#BFCBDD] bg-white/55 p-6 text-center transition-colors hover:border-[#0057D9] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057D9] sm:min-h-[320px]">
      <AnimatedAssetIcon src="/icons/a7-add-home-3d.png" width={72} height={72} hover="float" className="size-[72px]" imageClassName="drop-shadow-[0_9px_14px_rgba(18,59,115,.18)]" />
      <h2 className="mt-4 text-[16px] font-semibold">{tx("Add another home", "နောက်ထပ်အိမ်ထည့်မယ်")}</h2>
      <p className="mt-2 max-w-[240px] text-[10px] leading-5 text-[#667085]">{tx("Choose a home from Explore to unlock the full comparison.", "Explore မှ အိမ်တစ်လုံးရွေးပြီး အပြည့်အစုံနှိုင်းယှဉ်ပါ။")}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-[10px] font-semibold text-[#0057D9]">{tx("Explore homes", "အိမ်များရှာမယ်")}<ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
    </Link>
  );
}

function EmptyComparison({ tx }: { tx: (english: string, myanmar: string) => string }) {
  return (
    <section className="mt-8 overflow-hidden rounded-[24px] border border-[#E2DED7] bg-white px-6 py-12 text-center shadow-[0_10px_34px_rgba(15,27,45,.06)] sm:py-16">
      <AnimatedAssetIcon src="/icons/a7-add-home-3d.png" width={96} height={96} hover="float" className="mx-auto size-24" imageClassName="drop-shadow-[0_11px_17px_rgba(18,59,115,.18)]" />
      <h2 className="mt-5 text-[22px] font-semibold tracking-[-0.035em]">{tx("No homes selected yet", "နှိုင်းယှဉ်ရန် အိမ်မရွေးရသေးပါ")}</h2>
      <p className="mx-auto mt-2 max-w-[430px] text-[11px] leading-5 text-[#667085]">{tx("Tap “Compare this home” while exploring. You can review up to four homes here.", "အိမ်များရှာဖွေရင်း “နှိုင်းယှဉ်မယ်” ကိုနှိပ်ပါ။ ဤနေရာတွင် အိမ်လေးလုံးအထိ နှိုင်းယှဉ်နိုင်သည်။")}</p>
      <Link href="/search?purpose=rent" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-[14px] bg-[#0057D9] px-6 text-[11px] font-semibold text-white shadow-[0_6px_18px_rgba(0,87,217,.2)] transition-colors hover:bg-[#0049B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057D9] focus-visible:ring-offset-2">
        {tx("Explore property listings", "အိမ်စာရင်းများ ရှာမယ်")}<ChevronRight className="size-4" />
      </Link>
    </section>
  );
}

function ComparisonSection({ group, properties }: { group: ComparisonGroup; properties: Property[] }) {
  return (
    <section className="border-b border-[#E8E4DE] last:border-b-0" aria-labelledby={`compare-${group.id}`}>
      <div className="bg-[#F7F5F1] px-4 py-4 sm:px-5">
        <h3 id={`compare-${group.id}`} className="text-[14px] font-semibold tracking-[-0.02em]">{group.title}</h3>
        <p className="mt-1 text-[9px] leading-4 text-[#667085]">{group.description}</p>
      </div>
      <div className="divide-y divide-[#EEEAE4]">
        {group.rows.map((row) => <ComparisonDetailRow key={row.label} row={row} properties={properties} />)}
      </div>
    </section>
  );
}

function ComparisonDetailRow({ row, properties }: { row: ComparisonRow; properties: Property[] }) {
  const numericValues = row.numeric ? properties.map(row.numeric) : [];
  const bestValue = numericValues.length > 0 ? (row.best === "low" ? Math.min(...numericValues) : Math.max(...numericValues)) : null;
  const uniqueBest = bestValue !== null && numericValues.filter((value) => value === bestValue).length === 1;

  return (
    <div className="px-4 py-4 sm:grid sm:grid-cols-[150px_1fr] sm:gap-5 sm:px-5">
      <div className="mb-2.5 text-[9px] font-semibold uppercase tracking-[.1em] text-[#667085] sm:mb-0 sm:pt-3">{row.label}</div>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {properties.map((property, index) => {
          const isBest = Boolean(row.numeric && uniqueBest && bestValue !== null && row.numeric(property) === bestValue);
          return (
            <div key={property.id} className={cn("min-w-0 rounded-[13px] border border-[#ECE8E2] bg-[#FCFBF9] px-3 py-3 text-[10px] leading-5 text-[#344054]", isBest && "border-[#CFE5D7] bg-[#F1F7F3] text-[#205C3B]")}>
              <div className="mb-1.5 flex items-center justify-between gap-1">
                <span className={cn("inline-flex size-5 items-center justify-center rounded-full bg-[#E9EDF3] text-[8px] font-bold text-[#53677F]", isBest && "bg-[#D9EBDF] text-[#205C3B]")}>{index + 1}</span>
                {isBest && row.bestLabel && <span className="truncate text-[7px] font-semibold uppercase tracking-[.06em] text-[#287A4B]">{row.bestLabel}</span>}
              </div>
              <div className="min-w-0 break-words font-medium">{row.value(property)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ComparisonPromise({ tx, compact = false }: { tx: (english: string, myanmar: string) => string; compact?: boolean }) {
  return (
    <section className={cn("flex items-start gap-3 rounded-[18px] border border-[#D8E3F2] bg-white p-4", !compact && "mt-7 sm:p-5")}>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#EDF4FF] text-[#0057D9]"><Sparkles className="size-4" /></span>
      <div>
        <h2 className="text-[12px] font-semibold">{tx("A clearer decision—not an automatic answer", "ဆုံးဖြတ်ချက်ကို ရှင်းလင်းစေခြင်းသာ ဖြစ်သည်")}</h2>
        <p className="mt-1 text-[9px] leading-5 text-[#667085]">{tx("Highlights compare numbers only. Location, condition and the viewing experience still matter.", "ဖော်ပြချက်များသည် ကိန်းဂဏန်းများကိုသာ နှိုင်းယှဉ်ထားခြင်းဖြစ်သည်။ နေရာ၊ အခြေအနေနှင့် ကိုယ်တိုင်ကြည့်ရှုမှုလည်း အရေးကြီးသည်။")}</p>
      </div>
    </section>
  );
}

function ComparisonLoading({ tx }: { tx: (english: string, myanmar: string) => string }) {
  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-28 text-[#0F1B2D]">
      <ComparisonHeader tx={tx} />
      <main className="mx-auto max-w-[1180px] animate-pulse px-4 py-8 sm:px-6">
        <div className="h-3 w-28 rounded-full bg-[#E2DED7]" />
        <div className="mt-3 h-9 w-64 rounded-xl bg-[#E2DED7]" />
        <div className="mt-7 grid grid-cols-2 gap-3"><div className="h-64 rounded-[18px] bg-[#E9E6E0]" /><div className="h-64 rounded-[18px] bg-[#E9E6E0]" /></div>
      </main>
    </div>
  );
}

function ComparisonHeader({ tx }: { tx: (english: string, myanmar: string) => string }) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#E2DED7] bg-[#FAF8F5]/94 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/search?purpose=rent" className="grid size-11 place-items-center rounded-full border border-[#DDD9D1] bg-white text-[#0057D9] transition-colors hover:bg-[#EDF4FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057D9]" aria-label={tx("Back to explore", "အိမ်ရှာဖွေမှုသို့ပြန်ရန်")}><ArrowLeft className="size-[18px]" /></Link>
        <Link href="/" aria-label="A7 Property home"><A7Brand /></Link>
        <div className="ml-auto"><LanguageSwitcher compact /></div>
      </div>
    </header>
  );
}

function hasParking(property: Property) {
  return property.amenities.some((item) => item.toLowerCase().includes("parking"));
}

function hasDifference(row: ComparisonRow, properties: Property[]) {
  const values = properties.map(row.differenceKey);
  return values.some((value) => value !== values[0]);
}

export { PropertyComparison };
