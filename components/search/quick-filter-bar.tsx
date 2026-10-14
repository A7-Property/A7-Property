"use client";

import { Check, RotateCcw, SlidersHorizontal } from "lucide-react";

import { useLanguage } from "@/components/i18n/language-provider";
import { countAdvancedFilters, countDiscoveryFilters, type DiscoveryFilters } from "@/components/search/search-discovery";
import { propertyTypeLabels, type Property } from "@/lib/properties";
import { cn } from "@/lib/utils";

interface QuickFilterBarProps {
  value: DiscoveryFilters;
  onChange: (filters: DiscoveryFilters) => void;
  onOpenMore: () => void;
  onClear: () => void;
}

function QuickFilterBar({ value, onChange, onOpenMore, onClear }: QuickFilterBarProps) {
  const { isMyanmar, tx } = useLanguage();
  const set = <K extends keyof DiscoveryFilters>(key: K, next: DiscoveryFilters[K]) => onChange({ ...value, [key]: next });
  const propertyType = value.propertyTypes.length === 1 ? value.propertyTypes[0] : "";
  const priceOptions = value.purpose === "sale"
    ? [[tx("Any price", "မည်သည့်ဈေးမဆို"), ""], [tx("Up to 100M", "သန်း ၁၀၀ အထိ"), "100000000"], [tx("Up to 300M", "သန်း ၃၀၀ အထိ"), "300000000"], [tx("Up to 500M", "သန်း ၅၀၀ အထိ"), "500000000"]]
    : [[tx("Any price", "မည်သည့်ဈေးမဆို"), ""], [tx("Up to 5 သိန်း", "၅ သိန်းအထိ"), "500000"], [tx("Up to 8 သိန်း", "၈ သိန်းအထိ"), "800000"], [tx("Up to 15 သိန်း", "၁၅ သိန်းအထိ"), "1500000"]];
  const activeCount = countDiscoveryFilters(value) - Number(value.location !== "All Myanmar") - Number(value.purpose !== "rent");
  const advancedCount = countAdvancedFilters(value);

  return (
    <div className="hide-scrollbar mt-5 flex items-center gap-2.5 overflow-x-auto border-y border-[#172B3F]/8 py-3.5 max-sm:pr-8 max-sm:[mask-image:linear-gradient(90deg,#000_0%,#000_90%,transparent_100%)]" aria-label={tx("Quick filters", "အမြန်စစ်ထုတ်မှုများ")}>
      <QuickSelect label={tx("Price", "ဈေးနှုန်း")} selected={value.maxPrice !== null} value={value.maxPrice ?? ""} onChange={(next) => set("maxPrice", next ? Number(next) : null)}>
        {priceOptions.map(([label, price]) => <option key={label} value={price}>{label}</option>)}
      </QuickSelect>
      <QuickSelect label={tx("Property type", "အိမ်အမျိုးအစား")} selected={value.propertyTypes.length > 0} value={propertyType} onChange={(next) => set("propertyTypes", next ? [next as Property["property_type"]] : [])}>
        <option value="">{tx("Any type", "မည်သည့်အမျိုးအစားမဆို")}</option>
        {Object.entries(propertyTypeLabels).map(([key, label]) => <option key={key} value={key}>{isMyanmar ? ({ condo: "ကွန်ဒို", apartment: "တိုက်ခန်း", house: "လုံးချင်းအိမ်", mini_condo: "မီနီကွန်ဒို", villa: "ဗီလာ" } as Record<string, string>)[key] : label}</option>)}
      </QuickSelect>
      <QuickSelect label={tx("Bedrooms", "အိပ်ခန်း")} selected={value.bedrooms !== null} value={value.bedrooms ?? ""} onChange={(next) => set("bedrooms", next ? Number(next) : null)}>
        <option value="">{tx("Any beds", "အိပ်ခန်းအရေအတွက်မရွေး")}</option><option value="1">{tx("1+ beds", "အိပ်ခန်း ၁ ခန်းနှင့်အထက်")}</option><option value="2">{tx("2+ beds", "အိပ်ခန်း ၂ ခန်းနှင့်အထက်")}</option><option value="3">{tx("3+ beds", "အိပ်ခန်း ၃ ခန်းနှင့်အထက်")}</option><option value="4">{tx("4+ beds", "အိပ်ခန်း ၄ ခန်းနှင့်အထက်")}</option>
      </QuickSelect>
      <QuickSelect label={tx("Bathrooms", "ရေချိုးခန်း")} selected={value.bathrooms !== null} value={value.bathrooms ?? ""} onChange={(next) => set("bathrooms", next ? Number(next) : null)}>
        <option value="">{tx("Any baths", "ရေချိုးခန်းအရေအတွက်မရွေး")}</option><option value="1">{tx("1+ baths", "ရေချိုးခန်း ၁ ခန်းနှင့်အထက်")}</option><option value="2">{tx("2+ baths", "ရေချိုးခန်း ၂ ခန်းနှင့်အထက်")}</option><option value="3">{tx("3+ baths", "ရေချိုးခန်း ၃ ခန်းနှင့်အထက်")}</option><option value="4">{tx("4+ baths", "ရေချိုးခန်း ၄ ခန်းနှင့်အထက်")}</option>
      </QuickSelect>
      <button type="button" className={cn("inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-semibold shadow-sm transition-colors", value.verifiedOnly ? "border-[#123B73] bg-[#F1F6FF] text-[#123B73]" : "border-[#D5DEE8] bg-white text-[#526172] hover:border-[#123B73]/50")} aria-pressed={value.verifiedOnly} onClick={() => set("verifiedOnly", !value.verifiedOnly)}>
        <Check className="size-4" />{tx("Verified only", "စိစစ်ပြီးအိမ်များသာ")}
      </button>
      <button type="button" className={cn("inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-semibold shadow-sm transition-colors", advancedCount > 0 ? "border-[#123B73] bg-[#F1F6FF] text-[#123B73]" : "border-[#D5DEE8] bg-white text-[#526172] hover:border-[#123B73]/50")} onClick={onOpenMore}>
        <SlidersHorizontal className="size-4" />{tx("More filters", "နောက်ထပ်စစ်ထုတ်ရန်")}{advancedCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-[#123B73] text-[10px] !text-white">{advancedCount}</span>}
      </button>
      {activeCount > 0 && <button type="button" className="ml-1 inline-flex h-11 shrink-0 items-center gap-2 px-2 text-xs font-semibold text-[#123B73] hover:text-[#003F91]" onClick={onClear}><RotateCcw className="size-4" />{tx("Clear all", "အားလုံးရှင်းရန်")}</button>}
    </div>
  );
}

function QuickSelect({ label, selected, value, onChange, children }: { label: string; selected: boolean; value: string | number; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className={cn("relative inline-flex h-11 shrink-0 items-center rounded-full border px-4 shadow-sm transition-colors focus-within:ring-3 focus-within:ring-[#123B73]/15", selected ? "border-[#123B73] bg-[#F1F6FF] text-[#123B73]" : "border-[#D5DEE8] bg-white text-[#526172] hover:border-[#123B73]/50")}>
      <span className="sr-only">{label}</span>
      <select className="max-w-[150px] appearance-none bg-transparent pr-5 text-xs font-semibold focus-visible:!outline-none" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
      <span className="pointer-events-none absolute right-3 text-[11px]">⌄</span>
    </label>
  );
}

export { QuickFilterBar };
