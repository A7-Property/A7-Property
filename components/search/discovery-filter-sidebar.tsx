"use client";

import { CarFront, Check, RotateCcw } from "lucide-react";

import { useLanguage } from "@/components/i18n/language-provider";
import {
  amenityOptions,
  clearAdvancedFilters,
  lifestyleOptions,
  type DiscoveryFilters,
  type LifestyleFilter,
} from "@/components/search/search-discovery";
import { furnitureLabels, type FurnitureStatus } from "@/lib/properties";
import { cn } from "@/lib/utils";

interface DiscoveryFilterSidebarProps {
  value: DiscoveryFilters;
  onChange: (filters: DiscoveryFilters) => void;
  className?: string;
}

function DiscoveryFilterSidebar({ value, onChange, className }: DiscoveryFilterSidebarProps) {
  const { isMyanmar, tx } = useLanguage();
  const set = <K extends keyof DiscoveryFilters>(key: K, next: DiscoveryFilters[K]) => onChange({ ...value, [key]: next });
  const labelMyanmar: Record<string, string> = {
    Lift: "ဓာတ်လှေကား",
    Security: "လုံခြုံရေး",
    Gym: "အားကစားခန်းမ",
    Pool: "ရေကူးကန်",
    Balcony: "လသာဆောင်",
    Garden: "ဥယျာဉ်",
    "Near school": "ကျောင်းအနီး",
    "Near hospital": "ဆေးရုံအနီး",
    "Near market": "ဈေးအနီး",
    "Quiet street": "တိတ်ဆိတ်သောလမ်း",
  };

  function toggleAmenity(amenity: string) {
    set("amenities", value.amenities.includes(amenity) ? value.amenities.filter((item) => item !== amenity) : [...value.amenities, amenity]);
  }

  function toggleLifestyle(lifestyle: LifestyleFilter) {
    set("lifestyle", value.lifestyle.includes(lifestyle) ? value.lifestyle.filter((item) => item !== lifestyle) : [...value.lifestyle, lifestyle]);
  }

  return (
    <div className={cn("space-y-7", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-[-0.01em]">{tx("More filters", "နောက်ထပ်စစ်ထုတ်ရန်")}</h2>
          <p className="mt-1 text-xs text-[#667085]">{tx("Home features and daily lifestyle", "အိမ်အင်္ဂါရပ်များနှင့် နေ့စဉ်နေထိုင်မှုပုံစံ")}</p>
        </div>
        <button type="button" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#123B73] hover:text-[#003F91]" onClick={() => onChange(clearAdvancedFilters(value))}>
          <RotateCcw className="size-4" />{tx("Reset", "ပြန်လည်သတ်မှတ်ရန်")}
        </button>
      </div>

      <FilterGroup title={tx("Furniture & parking", "ပရိဘောဂနှင့် ကားပါကင်")}>
        <select className="h-12 w-full rounded-xl border border-[#B9BEC4] bg-white px-3 text-xs focus:border-[#123B73] focus-visible:!outline-none" value={value.furniture} onChange={(event) => set("furniture", event.target.value as DiscoveryFilters["furniture"])} aria-label={tx("Furniture", "ပရိဘောဂ")}>
          <option value="all">{tx("Any furniture", "ပရိဘောဂမရွေး")}</option>
          {(Object.entries(furnitureLabels) as Array<[FurnitureStatus, string]>).map(([key, label]) => <option key={key} value={key}>{isMyanmar ? ({ unfurnished: "ပရိဘောဂမပါ", partly_furnished: "ပရိဘောဂအချို့ပါ", fully_furnished: "ပရိဘောဂအပြည့်အစုံပါ" } as Record<string, string>)[key] : label}</option>)}
        </select>
        <label className="mt-2 flex cursor-pointer items-center justify-between rounded-lg border border-[#B8CCE4] bg-white p-3">
          <span className="flex items-center gap-2 text-xs font-medium"><CarFront className="size-[18px] text-[#123B73]" />{tx("Parking required", "ကားပါကင်လိုအပ်သည်")}</span>
          <input type="checkbox" className="size-4 accent-[#123B73]" checked={value.parking} onChange={(event) => set("parking", event.target.checked)} />
        </label>
      </FilterGroup>

      <FilterGroup title={tx("Amenities", "အဆောက်အအုံဝန်ဆောင်မှုများ")}>
        <div className="grid gap-1 sm:grid-cols-2">
          {amenityOptions.map((option) => <CheckRow key={option.value} label={isMyanmar ? labelMyanmar[option.label] ?? option.label : option.label} selected={value.amenities.includes(option.value)} onClick={() => toggleAmenity(option.value)} />)}
        </div>
      </FilterGroup>

      <FilterGroup title={tx("Lifestyle", "နေထိုင်မှုပုံစံ")} description={tx("Useful for everyday life in Myanmar", "မြန်မာနိုင်ငံရှိ နေ့စဉ်ဘဝအတွက် အသုံးဝင်သောအချက်များ")}>
        <div className="grid gap-1 sm:grid-cols-2">
          {lifestyleOptions.map((option) => <CheckRow key={option.value} label={isMyanmar ? labelMyanmar[option.label] ?? option.label : option.label} selected={value.lifestyle.includes(option.value)} onClick={() => toggleLifestyle(option.value)} />)}
        </div>
      </FilterGroup>
    </div>
  );
}

function FilterGroup({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2.5 block w-full text-[11px] font-semibold uppercase tracking-[0.1em] text-[#667085]">{title}</legend>
      {description && <p className="-mt-1 mb-2.5 text-[11px] text-[#858A91]">{description}</p>}
      {children}
    </fieldset>
  );
}

function CheckRow({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className="flex w-full items-center gap-2.5 rounded-lg px-1 py-2.5 text-left text-xs text-[#4A4A4F] hover:bg-[#EAF4FF]">
      <span className={cn("grid size-[18px] place-items-center rounded border", selected ? "border-[#123B73] bg-[#123B73] text-white" : "border-[#B9BEC4] bg-white")}>{selected && <Check className="size-3.5" />}</span>
      {label}
    </button>
  );
}

export { DiscoveryFilterSidebar };
