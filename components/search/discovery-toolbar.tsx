"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Map, Rows3 } from "lucide-react";

import { useLanguage } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";
import type { PropertySort, SearchFilters } from "@/lib/properties";

interface DiscoveryToolbarProps {
  count: number;
  location: string;
  purpose: SearchFilters["purpose"];
  sort: PropertySort;
  onSortChange: (sort: PropertySort) => void;
  mapOpen: boolean;
  onMapToggle: () => void;
}

function DiscoveryToolbar({ count, location, purpose, sort, onSortChange, mapOpen, onMapToggle }: DiscoveryToolbarProps) {
  const { tx } = useLanguage();
  const isSale = purpose === "sale";
  const heading = location === "All Myanmar"
    ? isSale ? tx("Homes for sale across Myanmar", "မြန်မာနိုင်ငံတစ်ဝန်း ရောင်းရန်အိမ်များ") : tx("Homes for rent across Myanmar", "မြန်မာနိုင်ငံတစ်ဝန်း ငှားရန်အိမ်များ")
    : isSale ? tx(`Homes for sale in ${location}`, `${location} ရှိ ရောင်းရန်အိမ်များ`) : tx(`Homes for rent in ${location}`, `${location} ရှိ ငှားရန်အိမ်များ`);

  return (
    <div>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">{isSale ? tx("Buy with confidence", "ယုံကြည်စိတ်ချစွာ ဝယ်ယူပါ") : tx("Find your next rental", "သင့်နောက်ငှားရန်အိမ်ကို ရှာပါ")}</p>
          <h1 className="mt-2 truncate text-[28px] font-semibold tracking-[-0.045em] text-[#172B3F] sm:text-[34px]">{heading}</h1>
          <p className="mt-2 text-[13px] leading-5 text-[#5F6C7B]">
            <span className="inline-flex items-center whitespace-nowrap">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.strong key={count} className="mr-1 font-semibold text-[#101828]" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.18 }}>{count}</motion.strong>
              </AnimatePresence>
              {isSale ? tx("homes for sale", "ရောင်းရန်အိမ်") : tx("rentals", "ငှားရန်အိမ်")}
            </span>
            <span className="hidden sm:inline"> · {tx("reviewed, refreshed, and ready to explore", "စိစစ်ပြီး နေ့စဉ်အသစ်ပြန်တင်ထားသည်")}</span>
            <span className="block sm:hidden">{tx("Reviewed and refreshed daily", "နေ့စဉ် စိစစ်ပြီး အသစ်ပြန်တင်ထားသည်")}</span>
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:items-center">
          <Button variant="outline" className="h-11 px-4 text-xs" onClick={onMapToggle}>{mapOpen ? <Rows3 className="size-[18px]" /> : <Map className="size-[18px]" />}{mapOpen ? tx("List", "စာရင်း") : tx("Map", "မြေပုံ")}<span className="hidden sm:inline"> {tx("view", "ပုံစံ")}</span></Button>
          <label>
            <span className="sr-only">{tx("Sort homes", "အိမ်များအစီအစဉ်ပြောင်းရန်")}</span>
            <select value={sort} onChange={(event) => onSortChange(event.target.value as PropertySort)} className="h-11 w-full rounded-xl border border-[#D7E0EA] bg-white px-3 text-xs font-semibold text-[#29445F] shadow-sm focus:border-[#123B73] focus-visible:!outline-none sm:w-auto">
              <option value="recommended">{tx("Recommended", "အကြံပြုထားသည်")}</option>
              <option value="newest">{tx("Newest", "အသစ်ဆုံး")}</option>
              <option value="price-asc">{tx("Price low–high", "ဈေးနည်းမှများ")}</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}

export { DiscoveryToolbar };
