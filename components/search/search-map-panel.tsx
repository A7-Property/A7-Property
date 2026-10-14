"use client";

import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";

import { useLanguage } from "@/components/i18n/language-provider";
import { PropertyMap } from "@/components/property/property-map";
import { formatCompactPrice, type Property } from "@/lib/properties";
import { cn } from "@/lib/utils";

interface SearchMapPanelProps {
  properties: Property[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

function SearchMapPanel({ properties, selectedId, onSelect, className }: SearchMapPanelProps) {
  const { tx, isMyanmar } = useLanguage();
  const priceLang = isMyanmar ? "my" : "en";
  return (
    <aside className={cn("relative min-w-0 overflow-hidden rounded-xl border border-[#B8CCE4] bg-white shadow-[0_2px_10px_rgba(42,42,51,.08)]", className)} aria-label={tx("Map results", "မြေပုံရလဒ်များ")}>
      <div className="flex h-14 items-center justify-between border-b border-[#B8CCE4] px-4">
        <div><h2 className="text-sm font-semibold">{tx("Explore on map", "မြေပုံပေါ်တွင် ကြည့်ရန်")}</h2><p className="mt-0.5 text-[11px] text-[#667085]">{properties.length} {tx("homes in this area", "လုံးရှိသည်")}</p></div>
        <span className="rounded-lg bg-[#F1F6FF] px-2.5 py-1.5 text-[10px] font-semibold text-[#123B73]">{tx("Live results", "လက်ရှိရလဒ်များ")}</span>
      </div>
      <PropertyMap className="h-[calc(100%-56px)] min-h-0 rounded-none border-0" properties={properties} selectedId={selectedId} onSelect={onSelect} markerLabel={(p) => formatCompactPrice(p, priceLang)} />
      <Link href="/assistant" className="absolute bottom-5 right-5 z-30 flex max-w-[245px] items-center gap-3 rounded-xl border border-[#E8C39B] bg-white/96 p-3 shadow-[0_10px_28px_rgba(42,42,51,.16)] backdrop-blur transition-transform hover:-translate-y-0.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#123B73] text-white"><Sparkles className="size-[18px]" /></span>
        <span className="min-w-0"><strong className="block text-xs font-semibold">{tx("Ask A7 AI", "A7 AI ကိုမေးမယ်")}</strong><span className="mt-0.5 block text-[11px] leading-4 text-[#667085]">{tx("Find homes near Hledan under 7 သိန်း", "လှည်းတန်းအနီး ၇ သိန်းအောက်အိမ်ရှာမယ်")}</span></span>
        <ChevronRight className="size-4 shrink-0 text-[#123B73]" />
      </Link>
    </aside>
  );
}

export { SearchMapPanel };
